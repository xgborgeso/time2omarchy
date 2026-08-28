import { describe, expect, it } from "vitest"
import { chooseDriver } from "@/server/db-driver"

describe("chooseDriver", () => {
  it("uses Postgres wherever a url is configured", () => {
    expect(chooseDriver({ databaseUrl: "postgres://x", isProduction: true })).toBe(
      "postgres",
    )
    expect(chooseDriver({ databaseUrl: "postgres://x", isProduction: false })).toBe(
      "postgres",
    )
  })

  it("falls back to the local file only in development", () => {
    expect(chooseDriver({ databaseUrl: null, isProduction: false })).toBe("pglite")
  })

  it("refuses to run in production on the local database", () => {
    // PGlite writes to disk, and a deployed instance's disk is ephemeral and
    // unshared: the board would silently reset and disagree between machines.
    expect(() => chooseDriver({ databaseUrl: null, isProduction: true })).toThrow(
      /DATABASE_URL/,
    )
  })
})
