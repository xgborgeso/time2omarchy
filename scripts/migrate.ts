/**
 * Applies migrations to a real Postgres database.
 *
 * Refuses to run without `DATABASE_URL`, which means it refuses to run against
 * the local PGlite directory — and that refusal is the whole point.
 *
 * PGlite is single-writer. `drizzle-kit migrate` opens `data/dev` in its own
 * process, so running it while `next dev` holds the same directory puts two
 * writers on one catalog. That is not a lock error; it corrupts pg_attribute
 * and takes the table with it, unreadable, including by SELECT.
 *
 * Locally there is nothing to run anyway: `openDatabase` migrates on open, so
 * restarting the dev server applies whatever `db:generate` just wrote.
 */
import { spawnSync } from "node:child_process"

const url = process.env.DATABASE_URL?.trim()

if (!url) {
  console.error(
    "Refusing to migrate: DATABASE_URL is not set, so this would open the\n" +
      "local PGlite directory as a second writer and corrupt it.\n\n" +
      "Locally, migrations apply themselves when the dev server starts:\n" +
      "  pnpm db:generate   # write the migration\n" +
      "  restart `pnpm dev` # applies it\n\n" +
      "For a real database, set DATABASE_URL and run this again.",
  )
  process.exit(1)
}

const result = spawnSync("drizzle-kit", ["migrate"], { stdio: "inherit" })
process.exit(result.status ?? 1)
