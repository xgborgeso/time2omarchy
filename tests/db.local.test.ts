import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it } from "vitest"
import { shouldReplace } from "../src/lib/ranking"
import * as schema from "../src/server/schema"
import { entries } from "../src/server/schema"

describe("local PGlite", () => {
  it("applies the schema and keeps the best time per handle", async () => {
    const sql = await readFile("drizzle/0000_init.sql", "utf8")
    const client = new PGlite()
    await client.waitReady
    await client.exec(sql)
    const db = drizzle(client, { schema })

    async function upsert(handle: string, timeSeconds: number) {
      const existing = await db
        .select()
        .from(entries)
        .where(eq(entries.handle, handle))
        .limit(1)
      const current = existing[0]
      if (current && !shouldReplace(current.timeSeconds, timeSeconds)) return current
      if (!current) {
        const rows = await db
          .insert(entries)
          .values({
            id: crypto.randomUUID(),
            handle,
            timeSeconds,
            bootScreenUrl: `/uploads/${handle}.png`,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()
        return rows[0]!
      }
      const rows = await db
        .update(entries)
        .set({ timeSeconds, updatedAt: new Date() })
        .where(eq(entries.handle, handle))
        .returning()
      return rows[0]!
    }

    await upsert("ada", 72)
    await upsert("ada", 43)
    await upsert("bob", 50)
    await upsert("ada", 90)

    const board = await db.select().from(entries).orderBy(entries.timeSeconds)
    expect(board.map((row) => [row.handle, row.timeSeconds])).toEqual([
      ["ada", 43],
      ["bob", 50],
    ])
  }, 20_000)
})
