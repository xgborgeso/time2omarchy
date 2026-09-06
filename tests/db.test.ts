import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Which database a process opens, and how often.
 *
 * Postgres wherever a url is set, the local PGlite file otherwise. Nothing
 * above this line knows which it got, which is the whole reason the local one
 * is real Postgres — but the choosing itself has consequences that only show
 * up in production, so it is worth pinning here.
 */
const postgresClient = vi.fn(() => ({ tag: "sql" }))
const drizzlePostgres = vi.fn(() => ({ tag: "postgres-db" }))
const openDatabase = vi.fn(async () => ({ db: { tag: "pglite-db" }, client: {} }))

vi.mock("postgres", () => ({ default: postgresClient }))
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: drizzlePostgres }))
vi.mock("../src/server/pglite", () => ({ openDatabase }))

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  postgresClient.mockClear()
  drizzlePostgres.mockClear()
  openDatabase.mockClear()
})

describe("with a database url", () => {
  it("opens Postgres, not the local file", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://example/db")
    const { getDb } = await import("../src/server/db")

    expect(await getDb()).toMatchObject({ tag: "postgres-db" })
    expect(openDatabase).not.toHaveBeenCalled()
  })

  it("takes one connection, because serverless runs many instances", async () => {
    // A pool per instance is how a database runs out of connections.
    vi.stubEnv("DATABASE_URL", "postgres://example/db")
    const { getDb } = await import("../src/server/db")
    await getDb()

    expect(postgresClient).toHaveBeenCalledWith(
      "postgres://example/db",
      expect.objectContaining({ max: 1, prepare: false }),
    )
  })

  it("does not migrate on the way in", async () => {
    // Cold starts are concurrent, and concurrent migrations race each other.
    // `pnpm db:migrate` is the only thing that runs them.
    vi.stubEnv("DATABASE_URL", "postgres://example/db")
    const { getDb } = await import("../src/server/db")
    await getDb()

    expect(drizzlePostgres).toHaveBeenCalledTimes(1)
  })

  it("ignores a url that is only whitespace", async () => {
    vi.stubEnv("DATABASE_URL", "   ")
    const { getDb } = await import("../src/server/db")

    expect(await getDb()).toMatchObject({ tag: "pglite-db" })
  })
})

describe("with no database url", () => {
  it("opens the local PGlite directory", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const { getDb } = await import("../src/server/db")

    expect(await getDb()).toMatchObject({ tag: "pglite-db" })
    expect(postgresClient).not.toHaveBeenCalled()
  })
})

describe("opening at most once", () => {
  it("hands every caller the same connection", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://example/db")
    const { getDb } = await import("../src/server/db")

    const [a, b] = await Promise.all([getDb(), getDb()])
    expect(a).toBe(b)
    expect(postgresClient).toHaveBeenCalledTimes(1)
  })

  it("does not cache a failure, so the next request can still connect", async () => {
    // A cached rejected promise means one bad cold start poisons the instance
    // for as long as it lives.
    vi.stubEnv("DATABASE_URL", "postgres://example/db")
    postgresClient.mockImplementationOnce(() => {
      throw new Error("refused")
    })
    const { getDb } = await import("../src/server/db")

    await expect(getDb()).rejects.toThrow("refused")
    await expect(getDb()).resolves.toMatchObject({ tag: "postgres-db" })
  })
})
