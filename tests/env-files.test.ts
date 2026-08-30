import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

/** Everything git currently tracks, one path per line. */
function tracked(): string[] {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split("\n")
}

/** Whether git would ignore a path that does not exist yet. */
function ignored(path: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", path])
    return true
  } catch {
    return false
  }
}

describe("env files in the repository", () => {
  it("tracks the template and nothing else env-shaped", () => {
    // A committed .env is not un-leaked by a later commit removing it — the
    // value stays in history and has to be rotated. Cheaper to never allow one.
    const envFiles = tracked().filter((p) => /(^|\/)\.env/.test(p))
    expect(envFiles).toEqual([".env.example"])
  })

  it("ignores every env name somebody might reach for", () => {
    // The rules listed files one at a time once, which left these committable.
    for (const name of [
      ".env",
      ".env.local",
      ".env.production",
      ".env.development",
      ".env.backup",
      ".env.save",
      ".env.old",
      ".env.prod.local",
    ]) {
      expect(ignored(name), `${name} should be ignored`).toBe(true)
    }
  })

  it("keeps the template itself out of that net", () => {
    expect(ignored(".env.example")).toBe(false)
  })

  it("ships no secret in the template", () => {
    // Every key is present so a fork knows what to fill in; no key has a value
    // unless that value is public and the same for everyone.
    const lines = require("node:fs").readFileSync(".env.example", "utf8").split("\n")
    const filled = lines
      .filter((l: string) => /^[A-Z_]+=.+/.test(l))
      .map((l: string) => l.split("=")[0])

    // Only these two carry a default, and both are public knowledge.
    expect(filled.sort()).toEqual(["BETTER_AUTH_URL", "PUBLIC_UPLOAD_BASE"])
  })
})
