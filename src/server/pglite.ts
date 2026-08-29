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
import { assertDatabaseFree, releaseLock, takeLock } from "./db-lock"
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
  // Checked before the directory is touched: opening it second is what does
  // the damage, and by the time PGlite reports anything it is already done.
  if (dataDir) assertDatabaseFree(dataDir, "opening it again")
  const client = dataDir ? new PGlite(dataDir) : new PGlite()
  await client.waitReady

  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })

  if (dataDir) {
    takeLock(dataDir)
    closeOnShutdown(client, dataDir)
  }

  return { client, db }
}

/**
 * Checkpoint on the way out, or the directory cannot be opened again.
 *
 * Postgres only makes a data directory recoverable at a checkpoint, and
 * PGlite writes one when the client is closed — which nothing does when a dev
 * server is killed. The result is a database that dies on its next open with
 * `PANIC: could not locate a valid checkpoint record`, unrecoverable because
 * PGlite ships no `pg_resetwal`. Restarting `next dev` was enough to trigger it.
 *
 * In-memory databases are exempt: tests have nothing to persist, and adding a
 * listener per test file would leak them.
 */
function closeOnShutdown(client: PGlite, dataDir: string): void {
  let closing = false
  const close = async (signal: NodeJS.Signals) => {
    if (closing) return
    closing = true
    // Best effort: if the runtime kills us first, the next open pays for it.
    await client.close().catch(() => {})
    releaseLock(dataDir)
    process.kill(process.pid, signal)
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      process.removeAllListeners(signal)
      void close(signal)
    })
  }
}
