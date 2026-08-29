/**
 * A copy of the board that does not live at the database provider.
 *
 * Neon branches are snapshots and they are excellent, but every one of them is
 * still inside the same account — they protect against a bad migration, not
 * against losing the account. This writes plain SQL to a directory you own.
 *
 *   DATABASE_URL='...' pnpm db:dump
 *
 * The whole dataset is handles, times and urls, so the file is kilobytes.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, statSync } from "node:fs"
import path from "node:path"

const url = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim()
if (!url) {
  console.error(
    "\n✗ DATABASE_URL is not set, so there is nothing remote to dump.\n" +
      "  The local board lives in data/dev and is reseeded with `pnpm db:fresh`.\n",
  )
  process.exit(1)
}

/** Outside the repo by default: this is real user data, not a fixture. */
const dir = process.env.DUMP_DIR?.trim() || path.resolve("../time2omarchy-backups")
mkdirSync(dir, { recursive: true })

// Sortable, and unambiguous across timezones.
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
const file = path.join(dir, `time2omarchy-${stamp}.sql`)

/**
 * Tables whose rows are deliberately left out.
 *
 * Better Auth's four hold live X access and refresh tokens and session
 * tokens — including them would make every backup a credentials file, which is
 * a much harder thing to store than a leaderboard. They are also the only
 * tables that regenerate themselves: ownership lives in `entries.identity_key`,
 * so somebody signing in again recreates their row and still owns their entry.
 *
 * `presence` is skipped for the same reason from the other direction: it is
 * whoever is on the site right now, and it is meaningless an hour later.
 *
 * The schema is still dumped for all of them, so this restores into an empty
 * database on its own.
 */
const DISPOSABLE = ["user", "account", "session", "verification", "presence"]

const result = spawnSync(
  "pg_dump",
  // Data and schema both: a dump you cannot restore into an empty database is
  // not a backup. `--no-owner` so it restores as whatever role you have.
  [
    url,
    "--no-owner",
    "--no-privileges",
    ...DISPOSABLE.map((t) => `--exclude-table-data=public.${t}`),
    "--file",
    file,
  ],
  { stdio: "inherit" },
)

if (result.error) {
  console.error(
    "\n✗ pg_dump is not on PATH. It ships with the postgresql client package.\n",
  )
  process.exit(1)
}
if (result.status !== 0) process.exit(result.status ?? 1)
if (!existsSync(file)) {
  console.error("\n✗ pg_dump reported success but wrote nothing.\n")
  process.exit(1)
}

const kb = Math.max(1, Math.round(statSync(file).size / 1024))
console.log(`\n✓ ${file}  (${kb} KB)\n`)
