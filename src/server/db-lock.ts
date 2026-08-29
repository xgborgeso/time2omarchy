/**
 * Who currently has the local database open.
 *
 * PGlite is single-writer, and it does not enforce that. A second process
 * opening the same directory does not fail with a lock error — it corrupts the
 * catalog, and the table comes back unreadable even to `SELECT`, with no
 * `pg_resetwal` to repair it. That has destroyed this database three times.
 *
 * So the lock is advisory and ours: whoever opens the directory writes its pid,
 * and every script that would open it too checks first.
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

function lockPath(dataDir: string): string {
  return path.join(dataDir, ".lock")
}

/** The live pid holding `dataDir`, or null if nobody is. */
export function holderOf(dataDir: string): number | null {
  let raw: string
  try {
    raw = readFileSync(lockPath(dataDir), "utf8")
  } catch {
    return null
  }

  const pid = Number.parseInt(raw.trim(), 10)
  if (!Number.isInteger(pid) || pid <= 0) return null
  if (pid === process.pid) return null

  try {
    // Signal 0 tests for the process without delivering anything.
    process.kill(pid, 0)
    return pid
  } catch (err) {
    // EPERM means it is alive but owned by someone else, which still counts.
    if ((err as { code?: string }).code === "EPERM") return pid
    // Anything else means it is gone: a stale lock, as a kill -9 leaves.
    return null
  }
}

export function takeLock(dataDir: string): void {
  try {
    writeFileSync(lockPath(dataDir), `${process.pid}\n`)
  } catch {
    // A lock we cannot write is a lock we do without. Refusing to open the
    // database because a hint file failed would be worse than the risk.
  }
}

export function releaseLock(dataDir: string): void {
  try {
    rmSync(lockPath(dataDir), { force: true })
  } catch {
    // Same reasoning: a stale lock is detected by its dead pid anyway.
  }
}

/**
 * Stops a script that would become the second writer.
 *
 * Refuses rather than killing the holder: the dev server is a process the
 * person started, often with logs they are reading, and a script that quietly
 * kills it is a worse surprise than one that asks.
 */
export function assertDatabaseFree(dataDir: string, action: string): void {
  const pid = holderOf(dataDir)
  if (pid == null) return

  console.error(
    `\n✗ The dev server (pid ${pid}) has this database open.\n` +
      `  PGlite is single-writer; ${action} now would corrupt it.\n\n` +
      "  Stop it first (Ctrl+C, or `pkill -f dist/bin/next`), then try again.\n",
  )
  process.exit(1)
}
