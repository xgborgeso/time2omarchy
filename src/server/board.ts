import { asc, avg, count, desc, eq, gte, lt, sql } from "drizzle-orm"
import { rankEntries } from "../lib/ranking"
import { bucketTimes, dailySeries } from "../lib/stats"
import type { BoardEntry, BoardResponse, StatsResponse } from "../lib/types"
import { getDb } from "./db"
import { entries } from "./schema"
import { rankedToday, readCounters, utcDay } from "./stats"

/** Days shown in the ranked trend. */
const DAILY_DAYS = 14

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/** A page the eye can still scan, and the unit the pager counts in. */
export const PER_PAGE = 50

export async function loadBoard(page = 1): Promise<BoardResponse> {
  const db = await getDb()
  const current = Math.max(1, Math.trunc(page) || 1)
  const offset = (current - 1) * PER_PAGE

  const [rows, activityRows, total, counters, leader] = await Promise.all([
    db
      .select()
      .from(entries)
      // Mirrors rankEntries so the page holds the rows it should.
      .orderBy(asc(entries.timeSeconds), desc(entries.verified), asc(entries.createdAt))
      .limit(PER_PAGE)
      .offset(offset),
    db
      .select({
        handle: entries.handle,
        timeSeconds: entries.timeSeconds,
        updatedAt: entries.updatedAt,
      })
      .from(entries)
      .orderBy(desc(entries.updatedAt))
      .limit(8),
    db.select({ n: count() }).from(entries),
    readCounters(),
    // The leader belongs to the board, not to the page being looked at.
    db
      .select({
        handle: entries.handle,
        timeSeconds: entries.timeSeconds,
        verified: entries.verified,
      })
      .from(entries)
      .orderBy(asc(entries.timeSeconds), desc(entries.verified), asc(entries.createdAt))
      .limit(1),
  ])

  const fastest = leader[0]?.timeSeconds ?? null

  const [faster, tied] = await Promise.all([
    // How many distinct times beat this page's first entry: the rank it holds
    // on the whole board, which is where a page's numbering has to start.
    offset === 0 || !rows[0]
      ? Promise.resolve([{ n: 0 }])
      : db
          .select({ n: sql<number>`count(distinct ${entries.timeSeconds})` })
          .from(entries)
          .where(lt(entries.timeSeconds, rows[0].timeSeconds)),
    fastest === null
      ? Promise.resolve([{ n: 0 }])
      : db.select({ n: count() }).from(entries).where(eq(entries.timeSeconds, fastest)),
  ])

  const ranked: BoardEntry[] = rankEntries(
    rows.map((row) => ({
      handle: row.handle,
      timeSeconds: row.timeSeconds,
      bootScreenUrl: row.bootScreenUrl,
      verified: row.verified,
      cpuId: row.cpuId,
      ramGb: row.ramGb,
      storage: row.storage,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    })),
    Number(faster[0]?.n ?? 0) + 1,
  )

  return {
    entries: ranked,
    page: current,
    perPage: PER_PAGE,
    total: total[0]?.n ?? ranked.length,
    activity: activityRows.map((row) => ({
      handle: row.handle,
      timeSeconds: row.timeSeconds,
      updatedAt: toIso(row.updatedAt),
    })),
    counters: {
      fastestSeconds: fastest,
      leaderHandle: leader[0]?.handle ?? null,
      leaderCount: Number(tied[0]?.n ?? 0),
      entries: total[0]?.n ?? ranked.length,
      visitorsToday: counters.visitorsToday,
      online: counters.online,
    },
  }
}

export async function loadStats(): Promise<StatsResponse> {
  const db = await getDb()
  const since = new Date(Date.now() - DAILY_DAYS * 24 * 60 * 60 * 1000)
  const [times, counters, todayCount, aggregate, recent] = await Promise.all([
    db.select({ t: entries.timeSeconds }).from(entries).orderBy(asc(entries.timeSeconds)),
    readCounters(),
    rankedToday(),
    db
      .select({
        n: count(),
        mean: avg(entries.timeSeconds),
      })
      .from(entries),
    db
      .select({ updatedAt: entries.updatedAt })
      .from(entries)
      .where(gte(entries.updatedAt, since)),
  ])

  const values = times.map((row) => row.t)
  let median: number | null = null
  if (values.length > 0) {
    const mid = Math.floor(values.length / 2)
    median =
      values.length % 2 === 0
        ? Math.round((values[mid - 1]! + values[mid]!) / 2)
        : values[mid]!
  }

  const meanRaw = aggregate[0]?.mean
  const mean = meanRaw == null ? null : Math.round(Number(meanRaw))

  const perDay = new Map<string, number>()
  for (const row of recent) {
    const day = toIso(row.updatedAt).slice(0, 10)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }

  return {
    distribution: bucketTimes(values),
    daily: dailySeries(
      [...perDay].map(([day, n]) => ({ day, count: n })),
      DAILY_DAYS,
      utcDay(),
    ),
    entries: Number(aggregate[0]?.n ?? values.length),
    fastestSeconds: values[0] ?? null,
    medianSeconds: median,
    meanSeconds: Number.isFinite(mean) ? mean : null,
    visitorsToday: counters.visitorsToday,
    viewsToday: counters.viewsToday,
    rankedToday: todayCount,
    online: counters.online,
  }
}

/**
 * One entry, by handle, with its true rank on the whole board.
 *
 * The board itself is capped at 100 — at ten thousand entries that is most
 * people's own entry missing, and with it every way to claim it. The rank is
 * counted in the database rather than read off the page, so it is the real
 * position and not a position within a page.
 */
export async function findEntryByHandle(handle: string): Promise<BoardEntry | null> {
  const db = await getDb()
  const rows = await db.select().from(entries).where(eq(entries.handle, handle)).limit(1)
  const row = rows[0]
  if (!row) return null

  // Dense ranking: how many distinct faster times exist, plus one.
  const faster = await db
    .select({ n: sql<number>`count(distinct ${entries.timeSeconds})` })
    .from(entries)
    .where(lt(entries.timeSeconds, row.timeSeconds))

  return {
    rank: Number(faster[0]?.n ?? 0) + 1,
    handle: row.handle,
    timeSeconds: row.timeSeconds,
    bootScreenUrl: row.bootScreenUrl,
    verified: row.verified,
    cpuId: row.cpuId,
    ramGb: row.ramGb,
    storage: row.storage,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}
