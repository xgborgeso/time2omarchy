import { count, eq, gte, lt, sql } from "drizzle-orm"
import { getDb } from "./db"
import { Limiter } from "./ratelimit"
import { dailyStats, entries, presence, visitorDays } from "./schema"

const ONLINE_MS = 2 * 60 * 1000

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Every board or stats request used to write four rows, and an open tab polls,
 * so a free GET bought a sustained write load — the cheapest request there is
 * paid for by the most expensive resource. A repeat visit inside these windows
 * changes nothing worth storing, so it is not stored.
 *
 * A limiter of max 1 is exactly "at most once per window per key".
 */
const presenceWrites = new Limiter({ windowMs: 30_000, max: 1 })
const dayWrites = new Limiter({ windowMs: 6 * 60 * 60 * 1000, max: 1 })
const sweeps = new Limiter({ windowMs: 60_000, max: 1 })
const viewFlushes = new Limiter({ windowMs: 5_000, max: 1 })

/** Views seen since the last flush. Added to the stored total when read. */
let pendingViews = 0

export async function touchPresence(visitorId: string, countView = true): Promise<void> {
  if (countView) pendingViews += 1

  const now = Date.now()
  const day = utcDay()

  const writePresence = presenceWrites.check(visitorId, now).allowed
  const writeDay = dayWrites.check(`${day}:${visitorId}`, now).allowed
  const flushViews = pendingViews > 0 && viewFlushes.check("views", now).allowed
  const sweep = sweeps.check("presence", now).allowed

  if (!writePresence && !writeDay && !flushViews && !sweep) return

  const db = await getDb()
  const at = new Date(now)

  if (writePresence) {
    await db
      .insert(presence)
      .values({ visitorId, lastSeen: at })
      .onConflictDoUpdate({
        target: presence.visitorId,
        set: { lastSeen: at },
      })
  }

  if (writeDay) {
    await db.insert(visitorDays).values({ day, visitorId }).onConflictDoNothing()
  }

  if (flushViews) {
    // Verify the batch before awaiting, so a request arriving mid-write starts
    // a fresh count rather than having its view written twice or not at all.
    const batch = pendingViews
    pendingViews = 0
    await db
      .insert(dailyStats)
      .values({ day, views: batch })
      .onConflictDoUpdate({
        target: dailyStats.day,
        set: { views: sql`${dailyStats.views} + ${batch}` },
      })
  }

  if (sweep) {
    const cutoff = new Date(now - 60 * 60 * 1000)
    await db.delete(presence).where(lt(presence.lastSeen, cutoff))
  }
}

export async function readCounters(): Promise<{
  visitorsToday: number
  viewsToday: number
  online: number
}> {
  const db = await getDb()
  const day = utcDay()
  const since = new Date(Date.now() - ONLINE_MS)

  const [visitors, views, online] = await Promise.all([
    db.select({ n: count() }).from(visitorDays).where(eq(visitorDays.day, day)),
    db.select({ n: dailyStats.views }).from(dailyStats).where(eq(dailyStats.day, day)),
    db.select({ n: count() }).from(presence).where(gte(presence.lastSeen, since)),
  ])

  return {
    visitorsToday: visitors[0]?.n ?? 0,
    // Include the batch still in memory so the counter reads live.
    viewsToday: (views[0]?.n ?? 0) + pendingViews,
    online: Math.max(1, online[0]?.n ?? 1),
  }
}

export async function rankedToday(): Promise<number> {
  const db = await getDb()
  const start = new Date(`${utcDay()}T00:00:00.000Z`)
  const rows = await db
    .select({ n: count() })
    .from(entries)
    .where(gte(entries.updatedAt, start))
  return rows[0]?.n ?? 0
}
