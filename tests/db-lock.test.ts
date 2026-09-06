import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assertDatabaseFree, holderOf, releaseLock, takeLock } from "../src/server/db-lock"

/**
 * The advisory lock on the local database.
 *
 * PGlite is single-writer and does not enforce it: a second process opening
 * the same directory corrupts the catalog, unreadable afterwards even to
 * SELECT, with no pg_resetwal to repair it. This file exists because that has
 * destroyed the development database three times.
 */
function dir(): string {
  return mkdtempSync(path.join(tmpdir(), "t2o-lock-"))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("holderOf", () => {
  it("finds nobody when there is no lock file", () => {
    expect(holderOf(dir())).toBeNull()
  })

  it("ignores our own pid, so a process does not block itself", () => {
    const d = dir()
    takeLock(d)
    expect(holderOf(d)).toBeNull()
  })

  it("names a live process holding it", () => {
    const d = dir()
    // A pid that exists and is not us: the parent, which cannot have exited
    // while this test is running.
    writeFileSync(path.join(d, ".lock"), `${process.ppid}\n`)
    expect(holderOf(d)).toBe(process.ppid)
  })

  it("treats a dead pid as no lock at all", () => {
    // What `kill -9` leaves behind. A stale file must not wedge the database
    // shut until somebody works out to delete it.
    const d = dir()
    writeFileSync(path.join(d, ".lock"), "999999999\n")
    expect(holderOf(d)).toBeNull()
  })

  it("ignores a lock file that is not a pid", () => {
    const d = dir()
    for (const junk of ["", "   ", "not-a-number", "-1", "0"]) {
      writeFileSync(path.join(d, ".lock"), junk)
      expect(holderOf(d)).toBeNull()
    }
  })

  it("counts a process owned by somebody else as holding it", () => {
    // EPERM means alive but not ours, which still means do not open.
    const d = dir()
    writeFileSync(path.join(d, ".lock"), "4242\n")
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw Object.assign(new Error("operation not permitted"), { code: "EPERM" })
    })
    expect(holderOf(d)).toBe(4242)
  })
})

describe("takeLock and releaseLock", () => {
  it("writes our pid and takes it away again", () => {
    const d = dir()
    takeLock(d)
    expect(readFileSync(path.join(d, ".lock"), "utf8").trim()).toBe(String(process.pid))

    releaseLock(d)
    expect(() => readFileSync(path.join(d, ".lock"), "utf8")).toThrow()
  })

  it("does without a lock it cannot write", () => {
    // Refusing to open the database because a hint file failed would be worse
    // than the risk the hint file protects against.
    expect(() => takeLock("/proc/nonexistent-directory")).not.toThrow()
  })

  it("does not complain about releasing one that was never taken", () => {
    expect(() => releaseLock(dir())).not.toThrow()
  })

  it("does not complain about releasing one that was never taken", () => {
    expect(() => releaseLock(dir())).not.toThrow()
  })
})

describe("assertDatabaseFree", () => {
  it("says nothing when the database is free", () => {
    expect(() => assertDatabaseFree(dir(), "opening it")).not.toThrow()
  })

  it("stops the caller, naming the pid and the way out", () => {
    // Refuses rather than killing the holder: the dev server is a process the
    // person started, often with logs they are reading.
    const d = dir()
    writeFileSync(path.join(d, ".lock"), `${process.ppid}\n`)

    const errors: string[] = []
    vi.spyOn(console, "error").mockImplementation((m: string) => errors.push(m))
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exited")
    }) as never)

    expect(() => assertDatabaseFree(d, "resetting it")).toThrow("exited")
    expect(exit).toHaveBeenCalledWith(1)
    expect(errors.join(" ")).toContain(String(process.ppid))
    expect(errors.join(" ")).toContain("resetting it")
  })
})
