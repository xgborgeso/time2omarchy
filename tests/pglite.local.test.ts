import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { holderOf } from "../src/server/db-lock"
import { openDatabase } from "../src/server/pglite"

/**
 * Opening a PGlite database and bringing it up to the current schema.
 *
 * One place, used by the server, the seed script and the tests, so there is a
 * single answer to "how does a database get its schema".
 */
const dirs: string[] = []
function scratch(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "t2o-pg-"))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe("openDatabase", () => {
  it("migrates an in-memory database and leaves no file behind", async () => {
    // What tests want: no directory, no lock, nothing to clean up.
    const { db, client } = await openDatabase()
    const rows = await client.query<{ n: number }>("select count(*)::int as n from entries")

    expect(rows.rows[0]?.n).toBe(0)
    expect(db).toBeDefined()
    await client.close()
  })

  it("takes the lock when it is given somewhere to persist", async () => {
    // PGlite is single-writer and does not enforce it. A second process
    // opening the same directory corrupts the catalog beyond repair.
    const dir = scratch()
    rmSync(dir, { recursive: true, force: true })

    const { client } = await openDatabase(dir)
    expect(existsSync(path.join(dir, ".lock"))).toBe(true)
    // Our own pid does not count as somebody else holding it.
    expect(holderOf(dir)).toBeNull()
    await client.close()
  })

  it("refuses to open a directory somebody else already has", async () => {
    // Refuses rather than corrupting: by the time PGlite reports anything,
    // the damage is already done.
    const dir = scratch()
    rmSync(dir, { recursive: true, force: true })
    const { client } = await openDatabase(dir)

    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exited")
    }) as never)
    vi.spyOn(console, "error").mockImplementation(() => {})
    // A live pid that is not ours, which is what a second process looks like.
    const { takeLock } = await import("../src/server/db-lock")
    vi.spyOn(process, "kill").mockReturnValue(true as never)
    takeLock(dir)
    const { writeFileSync } = await import("node:fs")
    writeFileSync(path.join(dir, ".lock"), `${process.ppid}\n`)

    await expect(openDatabase(dir)).rejects.toThrow("exited")
    expect(exit).toHaveBeenCalledWith(1)
    await client.close()
  })
})
