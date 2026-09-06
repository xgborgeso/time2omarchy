import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase } from "../src/server/pglite"
import { entries, uploads } from "../src/server/schema"

/**
 * Every procedure, called the way the browser calls it.
 *
 * The router is where input schemas, rate limits and identity meet, and none
 * of those are visible from the functions underneath — `requireCpuName` in
 * particular only exists as a refinement applied here, so testing `submitRank`
 * alone proves nothing about whether a nameless "Other" can reach the board.
 */
const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))
vi.mock("../src/server/storage", () => ({
  publicUploadBase: () => null,
  deleteBootScreen: async () => {},
}))

/** Signed in as whoever `identity` currently says, so a test can be nobody. */
let identity: { key: string; handle: string } | null = { key: "x:ada", handle: "ada" }
vi.mock("../src/server/identity", () => ({ identityFrom: async () => identity }))

const { appRouter } = await import("../src/server/trpc/router")
const { recordUpload } = await import("../src/server/uploads")

/**
 * A fresh throttle bucket per call.
 *
 * The limiters are module-level and per-process, so every test sharing one
 * key would spend the same eight-an-hour rank allowance between them and the
 * ninth would fail on the limit rather than on what it was testing. The limit
 * itself gets one test of its own, below, which is where a fixed key belongs.
 */
let bucket = 0
function freshKey(): string {
  bucket += 1
  return `test-${bucket}`
}

function caller(clientKey = freshKey()) {
  return appRouter.createCaller({
    headers: new Headers(),
    clientKey,
    resHeaders: new Headers(),
    secure: false,
  })
}

/** A complete, valid rank input; tests override only what they are about. */
function rankInput(over: Record<string, unknown> = {}) {
  return {
    time: "43s",
    bootScreenUrl: "/uploads/ada-1.png",
    bootScreenKey: "ada-1.png",
    bootScreenThumbUrl: "/uploads/thumb-ada-1.png",
    bootScreenThumbKey: "thumb-ada-1.png",
    cpuId: "amd-ryzen-7-9800x3d",
    ramGb: 32,
    storage: "nvme" as const,
    ...over,
  }
}

async function rank(over: Record<string, unknown> = {}, clientKey = freshKey()) {
  const input = rankInput(over)
  await recordUpload(input.bootScreenKey as string, identity?.key ?? "x:ada")
  await recordUpload(input.bootScreenThumbKey as string, identity?.key ?? "x:ada")
  // The overrides are deliberately loose so a test can send a bad value.
  // biome-ignore lint/suspicious/noExplicitAny: exercising the schema needs inputs it rejects
  return caller(clientKey).rank(input as any)
}

beforeEach(async () => {
  const db = await opened
  await db.delete(entries)
  await db.delete(uploads)
  identity = { key: "x:ada", handle: "ada" }
})

describe("the rank procedure", () => {
  it("takes a complete entry", async () => {
    const result = await rank()
    expect(result.ok).toBe(true)
  })

  it("refuses Other with no chip named", async () => {
    // The rule the catalogue queue rests on, checked where the browser meets
    // it. The form checks too, but the form is not the only caller.
    await expect(rank({ cpuId: "other", cpuOther: undefined })).rejects.toThrow()
  })

  it("takes Other once it says what it is", async () => {
    const result = await rank({ cpuId: "other", cpuOther: "Intel(R) N100" })
    expect(result.ok).toBe(true)

    const db = await opened
    const [row] = await db.select().from(entries).where(eq(entries.handle, "ada"))
    expect(row?.cpuOther).toBe("Intel(R) N100")
  })

  it("drops a name that arrived beside a catalogued chip", async () => {
    // A note next to a real id would contradict it, and would keep asking for
    // a chip the list already has.
    await rank({ cpuId: "amd-ryzen-7-9800x3d", cpuOther: "Intel N100" })

    const db = await opened
    const [row] = await db.select().from(entries).where(eq(entries.handle, "ada"))
    expect(row?.cpuOther).toBeNull()
  })

  it("refuses a chip that is in no catalogue at all", async () => {
    await expect(rank({ cpuId: "intel-pentium-ii" })).rejects.toThrow()
  })

  it("refuses a time outside what an install can take", async () => {
    // Under five seconds cannot have been an install, and a string that is
    // not a time at all is the other way the field goes wrong.
    await expect(rank({ time: "1s" })).rejects.toThrow()
    await expect(rank({ time: "not a time" })).rejects.toThrow()
  })

  it("asks for a sign-in rather than throwing when nobody is connected", async () => {
    // A refusal the page can act on: it opens the X flow. A thrown error would
    // reach the form as "something went wrong".
    identity = null
    const result = await rank()
    expect(result).toMatchObject({ ok: false, needsSignIn: true })
  })
})

describe("the read procedures", () => {
  it("answers with an empty board rather than failing", async () => {
    const board = await caller().board()
    expect(board.entries).toEqual([])
    expect(board.total).toBe(0)
  })

  it("returns the entry it just took", async () => {
    await rank()
    const board = await caller().board()
    expect(board.entries[0]).toMatchObject({ handle: "ada", rank: 1 })
  })

  it("searches by part of a handle", async () => {
    await rank()
    expect(await caller().search({ query: "ad" })).toHaveLength(1)
    expect(await caller().search({ query: "zz" })).toHaveLength(0)
  })

  it("searches the catalogue without touching the database", async () => {
    const found = await caller().cpus({ query: "9800X3D" })
    expect(found[0]?.id).toBe("amd-ryzen-7-9800x3d")
  })

  it("builds stats, narrowed or not", async () => {
    await rank()
    const all = await caller().stats()
    expect(all.entries).toBe(1)

    const narrowed = await caller().stats({ dimension: "storage", id: "nvme" })
    expect(narrowed.entries).toBe(1)
  })

  it("says it is alive", async () => {
    expect(await caller().health()).toMatchObject({ ok: true })
  })
})

describe("the report procedure", () => {
  it("records a report against an entry that exists", async () => {
    await rank()
    expect(await caller().report({ handle: "ada" })).toEqual({ ok: true })
  })

  it("says the same thing about a handle nobody ranked", async () => {
    // A taken-down entry and a handle that never existed must look identical
    // from outside, or the endpoint answers "does @x have an entry".
    const result = await caller().report({ handle: "nobody" })
    expect(result).toMatchObject({ ok: false })
  })
})

describe("the rate limit", () => {
  it("stops one caller ranking all afternoon", async () => {
    // A per-process backstop rather than the real defence — serverless
    // invocations share no memory — but the middleware is what every write
    // goes through, so its refusal is worth pinning.
    const key = "one-noisy-caller"
    const attempts = []
    for (let n = 0; n < 12; n += 1) {
      attempts.push(
        await rank({ time: `${40 + n}s` }, key).then(
          () => "took",
          (err: Error) => err.message,
        ),
      )
    }

    expect(attempts).toContain("Slow down. Try again in an hour.")
    // And the ones before the limit went through, so it is a cap rather than
    // a closed door.
    expect(attempts[0]).toBe("took")
  })
})

describe("when something below the router breaks", () => {
  it("says nothing about the database to whoever is watching", async () => {
    // Drizzle puts the whole statement in its message — `Failed query: select
    // "id", "handle", "identity_key" from "entries" …` — and five procedures
    // have no try/catch, so an unhandled blip would deliver the schema to the
    // network tab.
    const { formatError } = await import("../src/server/trpc/init")
    const shaped = formatError({
      shape: {
        message: 'Failed query: select "identity_key" from "entries"',
        code: -32603,
        data: { stack: "at open (db.ts:1)", code: "INTERNAL_SERVER_ERROR" },
      },
      error: { code: "INTERNAL_SERVER_ERROR" },
    })

    expect(shaped.message).toBe("Something went wrong. Try again in a moment.")
    expect(shaped.data).not.toHaveProperty("stack")
  })

  it("keeps the wording of a refusal it wrote on purpose", async () => {
    const { formatError } = await import("../src/server/trpc/init")
    const shaped = formatError({
      shape: { message: "Slow down. Try again in an hour.", code: -32029, data: {} },
      error: { code: "TOO_MANY_REQUESTS" },
    })
    expect(shaped.message).toBe("Slow down. Try again in an hour.")
  })

  it("replaces a zod dump even though the code is deliberate", async () => {
    // The forms validate before submitting, so reaching this means the form
    // was bypassed and there is nobody who needs the schema explained.
    const { formatError } = await import("../src/server/trpc/init")
    const shaped = formatError({
      shape: { message: '[{"code":"too_small","path":["time"]}]', code: -32600, data: {} },
      error: { code: "BAD_REQUEST" },
    })
    expect(shaped.message).toBe("Something went wrong. Try again in a moment.")
  })

  it("turns a thrown rank into a refusal the form can show", async () => {
    // The mutation catches rather than throwing, so the page gets a message
    // beside a field instead of "something went wrong".
    const { getDb } = await import("../src/server/db")
    const db = await getDb()
    const original = db.select
    // biome-ignore lint/suspicious/noExplicitAny: forcing the failure this catch exists for
    ;(db as any).select = () => {
      throw new Error('Failed query: select "identity_key" from "entries"')
    }
    try {
      const result = await rank()
      expect(result).toMatchObject({ ok: false, field: "form" })
      expect(result.ok === false && result.error).toBe("Ranking failed")
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restoring the stub
      ;(db as any).select = original
    }
  })

  it("turns a thrown report into one too", async () => {
    const { getDb } = await import("../src/server/db")
    const db = await getDb()
    const original = db.select
    // biome-ignore lint/suspicious/noExplicitAny: forcing the failure this catch exists for
    ;(db as any).select = () => {
      throw new Error("boom")
    }
    try {
      expect(await caller().report({ handle: "ada" })).toMatchObject({ ok: false })
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restoring the stub
      ;(db as any).select = original
    }
  })
})

describe("the boot screen a rank submits", () => {
  it("refuses a url that is not on the host we upload to", async () => {
    // Otherwise the board points every visitor at any remote image somebody
    // cared to name.
    const result = await rank({ bootScreenUrl: "https://elsewhere.example/f/ada-1.png" })
    expect(result).toMatchObject({ ok: false, field: "bootScreen" })
  })

  it("refuses a key that is not the one inside the url", async () => {
    // A mismatch could later delete a file belonging to somebody else.
    const result = await rank({ bootScreenThumbUrl: "/uploads/someone-else.png" })
    expect(result).toMatchObject({ ok: false, field: "bootScreen" })
  })
})

describe("the me procedure", () => {
  it("names the account the browser is signed in as", async () => {
    // What the rank button reads to decide between opening the form and
    // sending somebody to X.
    expect(await caller().me()).toEqual({ handle: "ada" })
  })

  it("answers with nobody rather than refusing", async () => {
    // A refusal here would be an error on every anonymous page load.
    identity = null
    expect(await caller().me()).toEqual({ handle: null })
  })
})

describe("stats on an empty board", () => {
  it("reports no mean rather than dividing by nothing", async () => {
    const stats = await caller().stats()
    expect(stats.entries).toBe(0)
    expect(stats.meanSeconds).toBeNull()
    expect(stats.fastestSeconds).toBeNull()
  })

  it("reports no mean for a filter that matches nothing either", async () => {
    await rank()
    const stats = await caller().stats({ dimension: "storage", id: "hdd" })
    expect(stats.meanSeconds).toBeNull()
  })
})

describe("asking for a particular page", () => {
  it("takes the page it was given, and defaults without one", async () => {
    await rank()
    expect((await caller().board({ page: 1 })).page).toBe(1)
    expect((await caller().board()).page).toBe(1)
    expect((await caller().board({ page: 3 })).entries).toEqual([])
  })
})
