import { eq } from "drizzle-orm"
import { decideEntry } from "../lib/ranking"
import { isStoredBootScreen } from "../lib/storage-key"
import type { BoardEntry, RankFailure, RankSuccess } from "../lib/types"
import { identityKeyFor } from "../lib/verification"
import { loadBoard } from "./board"
import { getDb } from "./db"
import { entries } from "./schema"
import { deleteBootScreen } from "./storage"
import { verifyClaim } from "./verify"

export type RankInput = {
  /** Already normalized and range-checked by the router's schemas. */
  handle: string
  timeSeconds: number
  /** A url this app issued; uploading is a separate step. */
  bootScreenUrl: string
  /** Both or neither: proof that the handle is yours. */
  nonce?: string
  postUrl?: string
  /** Required hardware, validated against the catalogue by the router. */
  cpuId: string
  ramGb: number
  storage: string
}

export async function submitRank(input: RankInput): Promise<RankSuccess | RankFailure> {
  const { handle, timeSeconds, bootScreenUrl } = input
  const specs = {
    cpuId: input.cpuId,
    ramGb: input.ramGb,
    storage: input.storage,
  }

  // The url arrives from the client now, so it has to be one we issued.
  // Without this the board would happily point every visitor at any remote
  // image someone cared to name.
  if (!isStoredBootScreen(bootScreenUrl)) {
    return { ok: false, error: "Upload the boot screen again.", field: "bootScreen" }
  }

  const db = await getDb()

  // Proof is optional: without it an entry may open a row but never touch one.
  const nonce = input.nonce?.trim() ?? ""
  const postUrl = input.postUrl?.trim() ?? ""
  let identityKey: string | null = null
  if (nonce && postUrl) {
    const proof = await verifyClaim(nonce, postUrl)
    if (!proof.ok) {
      return { ok: false, error: proof.error, field: "handle" }
    }
    if (proof.identityKey !== identityKeyFor(handle)) {
      return {
        ok: false,
        error: "That post proves a different handle.",
        field: "handle",
      }
    }
    identityKey = proof.identityKey
  }
  const verified = identityKey !== null

  const existing = await db
    .select()
    .from(entries)
    .where(eq(entries.handle, handle))
    .limit(1)

  const current = existing[0]

  const decision = decideEntry(
    current ? { timeSeconds: current.timeSeconds, verified: current.verified } : null,
    { timeSeconds, verified },
  )

  if (decision === "reject") {
    return {
      ok: false,
      error: `@${handle} is already on the board.`,
      field: "handle",
      needsProof: true,
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
      timeSeconds,
      bootScreenUrl,
      // A claim promotes the row for good; it never demotes a verified one.
      verified: verified || current.verified,
      identityKey: identityKey ?? current.identityKey,
      ...specs,
      updatedAt: now,
    })
    .where(eq(entries.handle, handle))
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
