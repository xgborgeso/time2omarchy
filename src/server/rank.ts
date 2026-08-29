import { eq, or } from "drizzle-orm"
import type { Identity } from "../lib/identity"
import { decideEntry } from "../lib/ranking"
import { keyMatchesUrl } from "../lib/storage-key"
import type { BoardEntry, RankFailure, RankSuccess } from "../lib/types"
import { loadBoard } from "./board"
import { type Db, getDb } from "./db"
import { entries } from "./schema"
import { deleteBootScreen, publicUploadBase } from "./storage"

export type RankInput = {
  timeSeconds: number
  /** A url this app issued; uploading is a separate step. */
  bootScreenUrl: string
  /** The storage key behind it, which is what deletes it later. */
  bootScreenKey: string
  /** The small copy the board draws, and its key. */
  bootScreenThumbUrl: string
  bootScreenThumbKey: string
  /** Required hardware, validated against the catalogue by the router. */
  cpuId: string
  ramGb: number
  storage: string
  /**
   * Who is ranking. Never optional, and never a typed string.
   *
   * Ranking goes through X first, so the handle on an entry is the handle X
   * answered with. There is nothing to impersonate and nothing to claim later.
   */
  identity: Identity
}

/**
 * Drops an upload that no entry ended up pointing at.
 *
 * Every rank uploads before it knows whether the board will take it — the file
 * has to exist for its url to be submitted at all — so the paths that keep an
 * existing entry leave a file behind that nothing references. Two slower
 * attempts is two orphans, and the storage tier is measured in gigabytes.
 *
 * Guarded by a lookup rather than deleted outright: the key arrives from the
 * client, and every key on the board is public in a boot screen url. Refusing
 * to delete one an entry still points at means a submitted key can only ever
 * remove a file that nothing is using.
 */
async function discardUnusedUpload(db: Db, ...keys: string[]): Promise<void> {
  for (const key of keys) {
    const used = await db
      .select({ id: entries.id })
      .from(entries)
      .where(or(eq(entries.bootScreenKey, key), eq(entries.bootScreenThumbKey, key)))
      .limit(1)
    if (used[0]) continue
    await deleteBootScreen(key)
  }
}

/**
 * The entry this submission belongs to.
 *
 * By account id, not by name: an X handle can be changed, and the entry has to
 * follow the account rather than stay behind under the old one.
 */
async function findEntry(db: Db, identityKey: string) {
  const owned = await db
    .select()
    .from(entries)
    .where(eq(entries.identityKey, identityKey))
    .limit(1)
  return owned[0]
}

export async function submitRank(input: RankInput): Promise<RankSuccess | RankFailure> {
  const {
    timeSeconds,
    bootScreenUrl,
    bootScreenKey,
    bootScreenThumbUrl,
    bootScreenThumbKey,
    identity,
  } = input
  const handle = identity.handle
  const specs = {
    cpuId: input.cpuId,
    ramGb: input.ramGb,
    storage: input.storage,
  }

  // Both arrive from the client, so both are checked: the url must be on the
  // host we upload to — otherwise the board would point every visitor at any
  // remote image someone cared to name — and the key must be the one inside
  // it, or a mismatch could later delete a file belonging to someone else.
  const base = publicUploadBase()
  if (
    !keyMatchesUrl(bootScreenKey, bootScreenUrl, base) ||
    !keyMatchesUrl(bootScreenThumbKey, bootScreenThumbUrl, base)
  ) {
    return { ok: false, error: "Upload the boot screen again.", field: "bootScreen" }
  }

  const db = await getDb()
  const current = await findEntry(db, identity.key)

  // The account was renamed into a handle another entry already holds. Rather
  // than break a unique constraint or quietly overwrite a stranger, say so.
  if (!current || current.handle !== handle) {
    const holder = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.handle, handle))
      .limit(1)
    if (holder[0] && holder[0].id !== current?.id) {
      await discardUnusedUpload(db, bootScreenKey, bootScreenThumbKey)
      return {
        ok: false,
        error: `@${handle} is already held by another entry.`,
        field: "handle",
      }
    }
  }

  const decision = decideEntry(current ? { timeSeconds: current.timeSeconds } : null, {
    timeSeconds,
  })

  if (decision === "keep" && current) {
    // The board keeps the faster time, so the screen just uploaded for this
    // one belongs to nothing.
    await discardUnusedUpload(db, bootScreenKey, bootScreenThumbKey)
    const board = await loadBoard()
    const entry = board.entries.find((e) => e.handle === handle)
    return {
      ok: true,
      created: false,
      improved: false,
      keptBest: true,
      bestTimeSeconds: current.timeSeconds,
      entry: entry ?? toEntry(current, board),
      board,
    }
  }

  const now = new Date()

  if (!current) {
    const inserted = await db
      .insert(entries)
      .values({
        id: crypto.randomUUID(),
        handle,
        timeSeconds,
        bootScreenUrl,
        bootScreenKey,
        bootScreenThumbUrl,
        bootScreenThumbKey,
        identityKey: identity.key,
        ...specs,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    const row = inserted[0]!
    const board = await loadBoard()
    const entry = board.entries.find((e) => e.handle === handle) ?? toEntry(row, board)
    return {
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: timeSeconds,
      entry,
      board,
    }
  }

  const updated = await db
    .update(entries)
    .set({
      // Written every time: X is the source of the name, so a rename lands
      // here on the owner's next rank rather than leaving a stale handle.
      handle,
      timeSeconds,
      bootScreenUrl,
      bootScreenKey,
      bootScreenThumbUrl,
      bootScreenThumbKey,
      ...specs,
      updatedAt: now,
    })
    .where(eq(entries.id, current.id))
    .returning()
  const row = updated[0]!
  // The previous object is now unreferenced, so drop it rather than leaking it.
  // Both halves of the pair, or the thumbnail outlives the screen it shrinks.
  if (current.bootScreenKey && current.bootScreenKey !== bootScreenKey) {
    await deleteBootScreen(current.bootScreenKey)
  }
  if (current.bootScreenThumbKey && current.bootScreenThumbKey !== bootScreenThumbKey) {
    await deleteBootScreen(current.bootScreenThumbKey)
  }
  const board = await loadBoard()
  const entry = board.entries.find((e) => e.handle === handle) ?? toEntry(row, board)
  return {
    ok: true,
    created: false,
    improved: timeSeconds < current.timeSeconds,
    keptBest: false,
    bestTimeSeconds: timeSeconds,
    entry,
    board,
  }
}

function toEntry(
  row: typeof entries.$inferSelect,
  board: { entries: BoardEntry[] },
): BoardEntry {
  return {
    rank: board.entries.find((e) => e.handle === row.handle)?.rank ?? 0,
    handle: row.handle,
    timeSeconds: row.timeSeconds,
    bootScreenUrl: row.bootScreenUrl,
    bootScreenThumbUrl: row.bootScreenThumbUrl,
    cpuId: row.cpuId,
    ramGb: row.ramGb,
    storage: row.storage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
