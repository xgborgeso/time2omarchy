import { and, asc, count, desc, eq, isNull, lt, sql } from "drizzle-orm"
import { benchmark, matchesSpec, median, type SpecFilter } from "../lib/benchmark"
import { rankEntries } from "../lib/ranking"
import { bucketTimes, dailySeries } from "../lib/stats"
import type { BoardEntry, BoardResponse, StatsResponse } from "../lib/types"
import { readAudience } from "./analytics"
import { getDb } from "./db"
import { entries } from "./schema"
import { rankedToday, utcDay } from "./stats"

/** Days shown in the ranked trend. */
const DAILY_DAYS = 14

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/** A page the eye can still scan, and the unit the pager counts in. */
export const PER_PAGE = 50

/**
 * On the board, as opposed to taken down.
 *
 * Every read goes through this. A takedown that removed a row from the page
 * but left it counted in the total, or ranked behind, or quoted by the hero,
 * would be a takedown in name only — so the condition lives in one place and
 * is spread across all of them rather than remembered at each.
 */
const visible = isNull(entries.hiddenAt)

export async function loadBoard(page = 1): Promise<BoardResponse> {
  const db = await getDb()
  const current = Math.max(1, Math.trunc(page) || 1)
  const offset = (current - 1) * PER_PAGE

  const [rows, activityRows, total, middle, audience, leader] = await Promise.all([
    db
      .select()
      .from(entries)
      .where(visible)
      // Mirrors rankEntries so the page holds the rows it should.
      .orderBy(asc(entries.timeSeconds), asc(entries.createdAt))
      .limit(PER_PAGE)
      .offset(offset),
    db
      .select({
        handle: entries.handle,
        timeSeconds: entries.timeSeconds,
        updatedAt: entries.updatedAt,
      })
      .from(entries)
      .where(visible)
      .orderBy(desc(entries.updatedAt))
      .limit(8),
    db.select({ n: count() }).from(entries).where(visible),
    /**
     * The middle time, as one aggregate rather than every row.
     *
     * `loadStats` reads all the times into memory because it also needs the
     * distribution; the board only needs this number, and the board is the
     * page everybody loads. Postgres does it in the index.
     */
    db
      .select({
        seconds: sql<
          number | null
        >`percentile_cont(0.5) within group (order by ${entries.timeSeconds})`,
      })
      .from(entries)
      .where(visible),
    readAudience(),
    /**
     * The leader the hero quotes, over the whole board rather than this page.
     *
     * There is no second query behind this any more: ranking goes through X,
     * so there is no such thing as an unproven entry to exclude.
     */
    db
      .select({ handle: entries.handle, timeSeconds: entries.timeSeconds })
      .from(entries)
      .where(visible)
      .orderBy(asc(entries.timeSeconds), asc(entries.createdAt))
      .limit(1),
  ])

  const headline = leader[0] ?? null
  const fastest = headline?.timeSeconds ?? null

  const [faster, tied] = await Promise.all([
    // How many distinct times beat this page's first entry: the rank it holds
    // on the whole board, which is where a page's numbering has to start.
    offset === 0 || !rows[0]
      ? Promise.resolve([{ n: 0 }])
      : db
          .select({ n: sql<number>`count(distinct ${entries.timeSeconds})` })
          .from(entries)
          .where(and(visible, lt(entries.timeSeconds, rows[0].timeSeconds))),
    fastest === null
      ? Promise.resolve([{ n: 0 }])
      : db
          .select({ n: count() })
          .from(entries)
          .where(and(visible, eq(entries.timeSeconds, fastest))),
  ])

  const ranked: BoardEntry[] = rankEntries(
    rows.map((row) => ({
      handle: row.handle,
      timeSeconds: row.timeSeconds,
      bootScreenUrl: row.bootScreenUrl,
      bootScreenThumbUrl: row.bootScreenThumbUrl,
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
    audience,
    counters: {
      fastestSeconds: fastest,
      // percentile_cont interpolates, so a board with an even number of
      // entries yields a fraction of a second that no entry ever held.
      medianSeconds:
        middle[0]?.seconds != null ? Math.round(Number(middle[0].seconds)) : null,
      leaderHandle: headline?.handle ?? null,
      leaderCount: Number(tied[0]?.n ?? 0),
      entries: total[0]?.n ?? ranked.length,
    },
  }
}

/**
 * Everything the stats page shows, optionally narrowed to one kind of machine.
 *
 * One query, then every figure computed from those rows. Vendor is not a
 * column — it is derived from the chip catalogue — so filtering by it cannot
 * happen in SQL anyway, and doing all of it in one place keeps the filtered
 * and unfiltered numbers guaranteed consistent with each other.
 */
export async function loadStats(filter?: SpecFilter): Promise<StatsResponse> {
  const db = await getDb()
  const since = new Date(Date.now() - DAILY_DAYS * 24 * 60 * 60 * 1000)

  const [rows, todayCount] = await Promise.all([
    db
      .select({
        t: entries.timeSeconds,
        cpuId: entries.cpuId,
        ramGb: entries.ramGb,
        storage: entries.storage,
        updatedAt: entries.updatedAt,
      })
      .from(entries)
      .where(visible)
      .orderBy(asc(entries.timeSeconds)),
    rankedToday(),
  ])

  const all = rows.map((row) => ({
    timeSeconds: row.t,
    cpuId: row.cpuId,
    ramGb: row.ramGb,
    storage: row.storage,
    updatedAt: row.updatedAt,
  }))

  // Measured over everything, always: narrowing every chart to the filter
  // would hide the bar you need in order to change your mind. The filter only
  // decides how deep the CPU chart looks.
  const hardware = benchmark(all, filter)
  const selected = filter ? all.filter((row) => matchesSpec(row, filter)) : all

  const values = selected.map((row) => row.timeSeconds)
  const mean =
    values.length > 0
      ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
      : null

  const perDay = new Map<string, number>()
  for (const row of selected) {
    if (row.updatedAt < since) continue
    const day = toIso(row.updatedAt).slice(0, 10)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }

  return {
    distribution: bucketTimes(values),
    hardware,
    daily: dailySeries(
      [...perDay].map(([day, n]) => ({ day, count: n })),
      DAILY_DAYS,
      utcDay(),
    ),
    entries: values.length,
    fastestSeconds: values[0] ?? null,
    medianSeconds: median(values),
    meanSeconds: mean,
    // Traffic, not hardware: these describe who is here, so a filter on the
    // machines people ranked with has nothing to say about them.
    rankedToday: todayCount,
  }
}

/**
 * One entry, by handle, with its true rank on the whole board.
 *
 * The board itself is capped at 100 — at ten thousand entries that is most
 * people's own entry missing, and with it every way to verify it. The rank is
 * counted in the database rather than read off the page, so it is the real
 * position and not a position within a page.
 */
export async function findEntryByHandle(handle: string): Promise<BoardEntry | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(entries)
    .where(and(visible, eq(entries.handle, handle)))
    .limit(1)
  const row = rows[0]
  if (!row) return null

  // Dense ranking: how many distinct faster times exist, plus one.
  const faster = await db
    .select({ n: sql<number>`count(distinct ${entries.timeSeconds})` })
    .from(entries)
    .where(and(visible, lt(entries.timeSeconds, row.timeSeconds)))

  return {
    rank: Number(faster[0]?.n ?? 0) + 1,
    handle: row.handle,
    timeSeconds: row.timeSeconds,
    bootScreenUrl: row.bootScreenUrl,
    bootScreenThumbUrl: row.bootScreenThumbUrl,
    cpuId: row.cpuId,
    ramGb: row.ramGb,
    storage: row.storage,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

/** Below this a fragment matches most of the board and narrows nothing. */
const MIN_QUERY = 2

/** A search replaces the board, so it returns what a page of it would hold. */
const MAX_MATCHES = PER_PAGE

/**
 * Entries whose handle contains what was typed.
 *
 * A search, not a lookup: typed a character at a time, exact matching shows
 * nothing until the final keystroke, which is indistinguishable from broken.
 *
 * `%` and `_` are LIKE wildcards, so they are escaped rather than passed
 * through — unescaped, a single `%` would return the entire board.
 */
export async function searchEntries(query: string): Promise<BoardEntry[]> {
  const needle = query.trim().replace(/^@+/, "").toLowerCase()
  if (needle.length < MIN_QUERY) return []

  const escaped = needle.replace(/[\\%_]/g, (char) => `\\${char}`)
  const db = await getDb()
  const rows = await db
    .select()
    .from(entries)
    .where(and(visible, sql`${entries.handle} LIKE ${`%${escaped}%`} ESCAPE '\\'`))
    .orderBy(asc(entries.timeSeconds), asc(entries.createdAt))
    .limit(MAX_MATCHES)

  // Ranked one at a time against the whole board: these rows are a filtered
  // set, so their position among each other says nothing about their rank.
  return Promise.all(
    rows.map(async (row) => {
      const faster = await db
        .select({ n: sql<number>`count(distinct ${entries.timeSeconds})` })
        .from(entries)
        .where(and(visible, lt(entries.timeSeconds, row.timeSeconds)))

      return {
        rank: Number(faster[0]?.n ?? 0) + 1,
        handle: row.handle,
        timeSeconds: row.timeSeconds,
        bootScreenUrl: row.bootScreenUrl,
        bootScreenThumbUrl: row.bootScreenThumbUrl,
        cpuId: row.cpuId,
        ramGb: row.ramGb,
        storage: row.storage,
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
      }
    }),
  )
}
