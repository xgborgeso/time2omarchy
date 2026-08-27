/**
 * Opening a PGlite database and bringing it up to the current schema.
 *
 * One place, used by the server, the seed script and the tests, so there is a
 * single answer to "how does a database get its schema" — previously six
 * callers each replayed a hand-written SQL file.
 */
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./schema"

const MIGRATIONS_DIR = path.resolve("drizzle")

export type Database = PgliteDatabase<typeof schema>

export type Opened = {
  client: PGlite
  db: Database
}

/**
 * @param dataDir Where to persist. Omit for an in-memory database, which is
 * what tests want: no file, no lock, nothing to clean up.
 */
export async function openDatabase(dataDir?: string): Promise<Opened> {
  const client = dataDir ? new PGlite(dataDir) : new PGlite()
  await client.waitReady

  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })

  return { client, db }
}
