import { eq } from "drizzle-orm"
import type { Identity } from "../lib/identity"
import { decideEntry } from "../lib/ranking"
import { isStoredBootScreen } from "../lib/storage-key"
import type { BoardEntry, RankFailure, RankSuccess } from "../lib/types"
import { loadBoard } from "./board"
import { type Db, getDb } from "./db"
import { entries } from "./schema"
import { deleteBootScreen, publicUploadBase } from "./storage"

export type RankInput = {
  /** Already normalized and range-checked by the router's schemas. */
  handle: string
  timeSeconds: number
  /** A url this app issued; uploading is a separate step. */
  bootScreenUrl: string
  /** Required hardware, validated against the catalogue by the router. */
  cpuId: string
  ramGb: number
  storage: string
  /** A proven X account, if one is carried. Counts only for its own handle. */
  identity: Identity | null
}

/**
 * The entry this submission belongs to.
 *
 * By account id first: an X handle can be changed, and the entry has to follow
 * the account rather than stay behind under the old name. Only then by handle,
 * which is how an anonymous entry — and a first-time claim of one — is found.
 */
async function findEntry(db: Db, handle: string, identityKey: string | null) {
  if (identityKey) {
    const owned = await db
      .select()
      .from(entries)
      .where(eq(entries.identityKey, identityKey))
      .limit(1)
    if (owned[0]) return owned[0]
  }
  const named = await db.select().from(entries).where(eq(entries.handle, handle)).limit(1)
  return named[0]
}

export async function submitRank(input: RankInput): Promise<RankSuccess | RankFailure> {
  const { timeSeconds, bootScreenUrl, identity } = input
  // There is no signed-in state in this product, only proof of one entry. The
  // handle is always the one typed; proof of @ada says nothing about @bob.
  const handle = input.handle
  const proven = identity?.handle === handle ? identity : null
  const specs = {
    cpuId: input.cpuId,
    ramGb: input.ramGb,
    storage: input.storage,
  }

  // The url arrives from the client now, so it has to be one we issued.
  // Without this the board would happily point every visitor at any remote
  // image someone cared to name.
  if (!isStoredBootScreen(bootScreenUrl, publicUploadBase())) {
    return { ok: false, error: "Upload the boot screen again.", field: "bootScreen" }
  }

  const db = await getDb()

  // Claiming is the whole of verification; there is nothing else to check.
  const identityKey = proven?.key ?? null
  const verified = proven !== null

  const current = await findEntry(db, handle, identityKey)

  // The account was renamed into a handle another entry already holds. Rather
  // than break a unique constraint or quietly overwrite a stranger, say so.
  if (current && current.handle !== handle) {
    const holder = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.handle, handle))
      .limit(1)
    if (holder[0] && holder[0].id !== current.id) {
      return {
        ok: false,
        error: `@${handle} is already held by another entry.`,
        field: "handle",
      }
    }
  }

  const decision = decideEntry(
    current ? { timeSeconds: current.timeSeconds, verified: current.verified } : null,
    { timeSeconds, verified },
  )

  if (decision === "reject") {
    return {
      ok: false,
      error: `@${handle} is already on the board.`,
      field: "handle",
      needsSignIn: true,
    }
  }

  if (decision === "keep" && current) {
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
        verified,
        identityKey,
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
      handle,
      timeSeconds,
      bootScreenUrl,
      // A claim promotes the entry for good; it never demotes a verified one.
      verified: verified || current.verified,
      identityKey: identityKey ?? current.identityKey,
      ...specs,
      updatedAt: now,
    })
    .where(eq(entries.id, current.id))
    .returning()
  const row = updated[0]!
  // The previous object is now unreferenced, so drop it rather than leaking it.
  if (current.bootScreenUrl !== bootScreenUrl) {
    await deleteBootScreen(current.bootScreenUrl)
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

/**
 * Proving an entry that is already on the board.
 *
 * Someone ranks as a guest, then decides they want the mark. Re-ranking would
 * work, but it would make them find the boot screen and retype a time that is
 * already there — so this proves ownership and changes nothing else.
 */
export async function claimEntry(
  identity: Identity,
  /** The entry the person asked for. A request, never authority. */
  requested: string,
): Promise<{ ok: true; entry: BoardEntry } | RankFailure> {
  // Checked before anything is looked up, so the answer names both sides
  // rather than leaving someone staring at a button that did nothing.
  if (identity.handle !== requested) {
    return {
      ok: false,
      // Named accounts told each side who the other was for no benefit; the
      // person already knows which entry they clicked.
      error: "That entry belongs to a different X account.",
      field: "handle",
    }
  }

  const db = await getDb()
  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.handle, identity.handle))
    .limit(1)

  const current = rows[0]
  if (!current) {
    return {
      ok: false,
      error: `Nothing on the board under @${identity.handle} yet.`,
      field: "handle",
    }
  }
  if (current.identityKey) {
    // Either already yours, or X reassigned the handle and the entry belongs
    // to whoever proved it. Neither is ours to overwrite.
    return {
      ok: false,
      error:
        current.identityKey === identity.key
          ? `@${identity.handle} is already verified.`
          : `@${identity.handle} is already claimed by another account.`,
      field: "handle",
    }
  }

  const claimed = await db
    .update(entries)
    .set({ verified: true, identityKey: identity.key, updatedAt: new Date() })
    .where(eq(entries.id, current.id))
    .returning()

  const board = await loadBoard()
  const row = claimed[0]!
  const entry = board.entries.find((e) => e.handle === row.handle) ?? toEntry(row, board)
  return { ok: true, entry }
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
    verified: row.verified,
    cpuId: row.cpuId,
    ramGb: row.ramGb,
    storage: row.storage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
