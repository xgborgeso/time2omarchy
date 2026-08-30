import { createHash, randomUUID } from "node:crypto"
import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { getDb } from "./db"
import { entries, reports } from "./schema"

export type ReportResult = { ok: true } | { ok: false; error: string }

/**
 * The reporter, reduced to something that can only be compared.
 *
 * The caller's address, hashed. There is no visitor cookie any more: the site
 * sets none, so there is no per-browser identifier to key on and nothing about
 * a reporter is stored beyond this.
 *
 * A missing address gets a fresh random key instead of a shared constant.
 * `clientKeyFrom` yields the literal "unknown" when no trusted proxy header is
 * configured, and hashing that gives every caller the same key — which, with
 * the unique index on `(entry_id, reporter_key)`, silently capped each entry
 * at one report forever. Deduplication is best-effort, so its failure has to
 * be an extra report, never a swallowed one.
 */
export function reporterKeyFor(address: string | null): string {
  const direct = address?.trim()
  if (!direct || direct === "unknown") return randomUUID()
  return createHash("sha256").update(direct).digest("hex").slice(0, 32)
}

/**
 * Where a report goes once it is written down.
 *
 * Console only, deliberately, and the same shape as `captureError`: the
 * database row is the record that matters, so choosing between email, Sentry
 * or anything else stays a change to this function alone.
 */
export async function notifyReport(handle: string, total: number): Promise<void> {
  console.warn(`[report] @${handle} has ${total} report${total === 1 ? "" : "s"}`)
}

/**
 * Files one report against an entry.
 *
 * Reporting the same entry twice is not an error worth showing: the person
 * pressed a button and the outcome they wanted is already true.
 */
export async function reportEntry(
  handle: string,
  address: string | null,
): Promise<ReportResult> {
  const db = await getDb()
  const rows = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.handle, handle), isNull(entries.hiddenAt)))
    .limit(1)

  const entry = rows[0]
  // Says nothing about whether the handle exists: a taken-down entry and a
  // handle nobody ranked should look the same from outside.
  if (!entry) return { ok: false, error: "There is nothing to report there." }

  await db
    .insert(reports)
    .values({ entryId: entry.id, reporterKey: reporterKeyFor(address) })
    .onConflictDoNothing()

  const [tally] = await db
    .select({ n: count() })
    .from(reports)
    .where(eq(reports.entryId, entry.id))

  await notifyReport(handle, Number(tally?.n ?? 1))
  return { ok: true }
}

export type OpenReport = {
  handle: string
  bootScreenUrl: string
  reports: number
  lastReportedAt: Date
  hidden: boolean
}

/** Everything reported and still standing, worst first. Read by the CLI. */
export async function openReports(): Promise<OpenReport[]> {
  const db = await getDb()
  const rows = await db
    .select({
      handle: entries.handle,
      bootScreenUrl: entries.bootScreenUrl,
      hiddenAt: entries.hiddenAt,
      n: count(reports.id),
      last: sql<Date>`max(${reports.createdAt})`,
    })
    .from(reports)
    .innerJoin(entries, eq(entries.id, reports.entryId))
    .groupBy(entries.handle, entries.bootScreenUrl, entries.hiddenAt)
    .orderBy(desc(count(reports.id)))

  return rows.map((row) => ({
    handle: row.handle,
    bootScreenUrl: row.bootScreenUrl,
    reports: Number(row.n),
    lastReportedAt: new Date(row.last),
    hidden: row.hiddenAt != null,
  }))
}
