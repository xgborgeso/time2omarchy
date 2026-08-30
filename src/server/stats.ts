import { count, gte } from "drizzle-orm"
import { getDb } from "./db"
import { entries } from "./schema"

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10)
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
