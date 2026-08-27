import path from "node:path"
import type { PgliteDatabase } from "drizzle-orm/pglite"
import * as schema from "./schema"

export type Db = PgliteDatabase<typeof schema>

const LOCAL_PG_DIR = path.resolve("data/dev")
const INIT_SQL = path.resolve("drizzle/0000_init.sql")

let cached: Promise<Db> | null = null

export function getDb(): Promise<Db> {
  if (!cached) {
    cached = openPglite().catch((err) => {
      cached = null
      throw err
    })
  }
  return cached
}

/**
 * PGlite: real Postgres, in-process and file-backed. No server, no container,
 * no connection string.
 *
 * `drizzle/0000_init.sql` is written to be idempotent (IF NOT EXISTS on every
 * object), so replaying it on boot brings any database up to the current
 * schema without a journal.
 */
async function openPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite")
  const { drizzle } = await import("drizzle-orm/pglite")
  const fs = await import("node:fs/promises")

  await fs.mkdir(LOCAL_PG_DIR, { recursive: true })
  const client = new PGlite(LOCAL_PG_DIR)
  await client.waitReady
  await client.exec(await fs.readFile(INIT_SQL, "utf8"))
  return drizzle(client, { schema })
}
