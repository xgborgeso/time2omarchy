/**
 * The chips the catalogue is missing, as told by the people who have them.
 *
 * Every entry that reached for "Other" was a search that failed. The id alone
 * records only that it failed; `cpu_other` records what it failed at, and this
 * is where that turns back into a list of chips to add.
 *
 * Read by `pnpm cpu-requests` and nothing else — the column never reaches a
 * page, so this is the only place the text is ever looked at, and it is looked
 * at by a person.
 */
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { normalizeCpuText, OTHER_CPU_ID, searchCpus } from "../lib/cpus"
import {
  promotions,
  REQUESTS_PATH,
  type RequestsFile,
  readRequests,
  writeRequests,
} from "./cpu-decisions"
import { getDb } from "./db"
import { entries } from "./schema"

export type CpuRequest = {
  /** As it was written, from whichever entry named it most recently. */
  name: string
  /** How many entries named the same chip, once spelling is set aside. */
  entries: number
  lastSeenAt: Date
  /**
   * What the picker would find for this text today.
   *
   * Non-empty means the chip is already in the catalogue and the search is
   * what missed it — a matcher bug to fix, not a line to add. Empty is a
   * genuine request.
   */
  matches: string[]
}

/**
 * Every named chip the catalogue does not have, most-wanted first.
 *
 * Grouped on the normalized text rather than the raw string, so
 * `AMD Ryzen 5 7530U` and `AMD Ryzen 5 7530U with Radeon Graphics` are one
 * request for one chip instead of two entries a maintainer has to notice are
 * the same.
 */
export async function cpuRequests(): Promise<CpuRequest[]> {
  const db = await getDb()
  const rows = await db
    .select({
      name: entries.cpuOther,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .where(and(eq(entries.cpuId, OTHER_CPU_ID), isNotNull(entries.cpuOther)))
    .orderBy(desc(entries.updatedAt))

  const grouped = new Map<string, { name: string; entries: number; lastSeenAt: Date }>()
  for (const row of rows) {
    // The column is nullable and the filter above is in SQL; this narrows the
    // type without trusting the query to have done it.
    /* v8 ignore next -- @preserve: the query already filters isNotNull(cpuOther); this narrows the type */
    if (!row.name) continue
    const key = normalizeCpuText(row.name)
    if (!key) continue
    const seen = grouped.get(key)
    if (seen) seen.entries += 1
    // Rows arrive newest first, so the first spelling of a chip is its most
    // recent one — and `updatedAt` on that row is when it was last asked for.
    else grouped.set(key, { name: row.name, entries: 1, lastSeenAt: row.updatedAt })
  }

  return [...grouped.values()]
    .map((request) => ({
      ...request,
      matches: searchCpus(request.name, 3).map((cpu) => `${cpu.vendor} ${cpu.name}`),
    }))
    .sort(
      (a, b) => b.entries - a.entries || b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
    )
}

/** How many entries still sit in the bucket without naming anything. */
export async function unnamedOtherCount(): Promise<number> {
  const db = await getDb()
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(entries)
    .where(and(eq(entries.cpuId, OTHER_CPU_ID), sql`${entries.cpuOther} is null`))
  /* v8 ignore next -- @preserve: a count() query returns exactly one row */
  return Number(row?.n ?? 0)
}

/**
 * Folds what people asked for into the decision log.
 *
 * Adds; never rewrites. A request already ruled on keeps its verdict and its
 * figures frozen — refreshing a rejected chip's count would churn the diff
 * every week to say nothing, and the count that mattered is the one it had
 * when somebody looked at it.
 */
export async function syncRequests(log = REQUESTS_PATH): Promise<{
  file: RequestsFile
  added: string[]
}> {
  const file = readRequests(log)
  /**
   * Keyed on the reported spelling normalized afresh, not on the stored
   * `query`.
   *
   * The key is whatever the normalizer produces today, and the normalizer
   * changes — stripping "proc" re-keyed every existing decision at a stroke,
   * which would have re-opened settled rejections on the next sync. Deriving
   * the key here instead means the log re-keys itself and a verdict outlives
   * any change to the matching. `query` is a derived field, kept in the file
   * only so a person can see what two spellings were folded together.
   */
  const decided = new Map(
    file.requests.map((request) => [normalizeCpuText(request.reported), request]),
  )
  const added: string[] = []

  for (const row of await cpuRequests()) {
    const query = normalizeCpuText(row.name)
    const seen = decided.get(query)
    const lastSeen = row.lastSeenAt.toISOString().slice(0, 10)

    if (!seen) {
      decided.set(query, {
        query,
        reported: row.name,
        entries: row.entries,
        lastSeen,
        status: "pending",
      })
      added.push(row.name)
      continue
    }
    // Only a request still waiting on a person is worth keeping current: the
    // figures are what they will judge it on.
    if (seen.status === "pending") {
      decided.set(query, {
        ...seen,
        query,
        reported: row.name,
        entries: row.entries,
        lastSeen,
      })
      continue
    }
    // Decided, so the verdict and its figures are frozen — but the key it is
    // filed under still follows the normalizer.
    if (seen.query !== query) decided.set(query, { ...seen, query })
  }

  const next = { requests: [...decided.values()] }
  writeRequests(next, log)
  return { file: next, added }
}

export type Promotion = {
  cpuId: string
  handles: string[]
}

/**
 * Entries an approved decision now has a real chip for.
 *
 * Read first and written only when asked. This is the one step that changes
 * somebody else's row, so it is never a side effect of adding a chip — the
 * catalogue growing and an entry being rewritten are separate decisions, and
 * only the second one is irreversible.
 */
export async function pendingPromotions(log = REQUESTS_PATH): Promise<Promotion[]> {
  const wanted = promotions(readRequests(log))
  if (wanted.size === 0) return []

  const db = await getDb()
  const rows = await db
    .select({ handle: entries.handle, name: entries.cpuOther })
    .from(entries)
    .where(and(eq(entries.cpuId, OTHER_CPU_ID), isNotNull(entries.cpuOther)))

  const byCpu = new Map<string, string[]>()
  for (const row of rows) {
    /* v8 ignore next -- @preserve: the query already filters isNotNull(cpuOther); this narrows the type */
    if (!row.name) continue
    const cpuId = wanted.get(normalizeCpuText(row.name))
    if (!cpuId) continue
    const held = byCpu.get(cpuId)
    if (held) held.push(row.handle)
    else byCpu.set(cpuId, [row.handle])
  }

  return [...byCpu].map(([cpuId, handles]) => ({ cpuId, handles }))
}

/** Moves those entries onto their chip, and clears the note they no longer need. */
export async function applyPromotions(list: readonly Promotion[]): Promise<number> {
  const db = await getDb()
  let moved = 0
  for (const promotion of list) {
    if (promotion.handles.length === 0) continue
    const updated = await db
      .update(entries)
      .set({ cpuId: promotion.cpuId, cpuOther: null })
      .where(inArray(entries.handle, promotion.handles))
      .returning({ handle: entries.handle })
    moved += updated.length
  }
  return moved
}
