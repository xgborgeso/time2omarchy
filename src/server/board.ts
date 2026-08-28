import { asc, avg, count, desc, gte } from "drizzle-orm"
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

export async function loadBoard(): Promise<BoardResponse> {
  const db = await getDb()
  const [rows, activityRows, total, counters] = await Promise.all([
    db
      .select()
      .from(entries)
      // Mirrors rankEntries so the right 100 rows survive the limit.
      .orderBy(asc(entries.timeSeconds), desc(entries.verified), asc(entries.createdAt))
      .limit(100),
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
  )

  return {
    entries: ranked,
    activity: activityRows.map((row) => ({
      handle: row.handle,
      timeSeconds: row.timeSeconds,
      updatedAt: toIso(row.updatedAt),
    })),
    counters: {
      fastestSeconds: ranked[0]?.timeSeconds ?? null,
      leaderHandle: ranked[0]?.handle ?? null,
      leaderCount: ranked.filter((e) => e.rank === 1).length,
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
