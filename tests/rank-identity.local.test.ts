import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Identity } from "../src/lib/identity"
import { openDatabase } from "../src/server/pglite"
import { entries } from "../src/server/schema"

/**
 * Ranking against real PGlite, with identity handed in the way the router
 * hands it: resolved from the session before `submitRank` is ever called.
 *
 * There is no guest path left to test. Ranking goes through X, so the router
 * refuses before it reaches here and `identity` is not nullable.
 *
 * An in-memory database per file, swapped in for the on-disk dev one — the
 * board, the counters and the rank path all read through the same `getDb`.
 */
const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))

const { submitRank } = await import("../src/server/rank")
const { findEntryByHandle, loadBoard, searchEntries } = await import("../src/server/board")

const ADA: Identity = { key: "x:1665012345678901234", handle: "ada" }

type Over = Partial<Parameters<typeof submitRank>[0]> & { handle?: string }

/** One account per handle unless a test says otherwise. */
function input({ handle, ...over }: Over = {}) {
  const who = handle ?? "ada"
  return {
    timeSeconds: 43,
    bootScreenUrl: "/uploads/ada-1.png",
    cpuId: "amd-ryzen-7-9800x3d",
    ramGb: 32,
    storage: "nvme",
    identity: { key: `x:${who}`, handle: who },
    ...over,
  }
}

beforeEach(async () => {
  await (await opened).delete(entries)
})

async function entryFor(handle: string) {
  const db = await opened
  const rows = await db.select().from(entries).where(eq(entries.handle, handle)).limit(1)
  return rows[0]
}

describe("ranking through X", () => {
  it("keys the entry to the account id, not to the name", async () => {
    const result = await submitRank(input({ identity: ADA }))

    expect(result.ok).toBe(true)
    const row = await entryFor("ada")
    expect(row?.identityKey).toBe("x:1665012345678901234")
  })

  it("takes the handle from the account, never from the caller", async () => {
    // There is no handle field on the input any more. Whatever the form
    // thinks it is submitting, the row is named by whoever X answered with.
    await submitRank(input({ identity: ADA }))

    expect(await entryFor("ada")).toBeDefined()
  })

  it("replaces your own entry when you beat it", async () => {
    await submitRank(input({ identity: ADA, timeSeconds: 61 }))
    await submitRank(input({ identity: ADA, timeSeconds: 44 }))

    const db = await opened
    expect(await db.select().from(entries)).toHaveLength(1)
    expect((await entryFor("ada"))?.timeSeconds).toBe(44)
  })

  it("keeps your best when the new time is slower", async () => {
    await submitRank(input({ identity: ADA, timeSeconds: 43 }))
    const result = await submitRank(input({ identity: ADA, timeSeconds: 90 }))

    expect(result.ok).toBe(true)
    expect((await entryFor("ada"))?.timeSeconds).toBe(43)
  })

  it("follows a renamed account to its existing entry", async () => {
    // X handles can be changed and re-registered. The account id cannot, so a
    // rename must move the row rather than open a second one.
    await submitRank(input({ identity: ADA }))
    await submitRank(input({ timeSeconds: 40, identity: { ...ADA, handle: "adalove" } }))

    const db = await opened
    expect(await db.select().from(entries)).toHaveLength(1)
    const row = await entryFor("adalove")
    expect(row?.timeSeconds).toBe(40)
    expect(row?.identityKey).toBe(ADA.key)
  })

  it("refuses to rename into a handle another account already holds", async () => {
    // X frees a handle when it is changed, so someone can genuinely arrive
    // carrying a name that is already on the board. Whoever ranked it keeps it.
    await submitRank(input({ handle: "ada" }))
    await submitRank(input({ identity: { key: "x:777", handle: "bob" } }))

    const result = await submitRank(input({ identity: { key: "x:777", handle: "ada" } }))

    expect(result.ok).toBe(false)
    expect((await entryFor("ada"))?.identityKey).toBe("x:ada")
  })
})

describe("finding one entry among many", () => {
  it("returns an entry by handle whatever its rank", async () => {
    // The board pages at fifty. At ten thousand entries that is the whole
    // problem: someone at #4000 cannot otherwise see their own entry.
    await submitRank(input({ handle: "ada", timeSeconds: 61 }))

    const found = await findEntryByHandle("ada")

    expect(found?.handle).toBe("ada")
    expect(found?.timeSeconds).toBe(61)
    expect(found?.rank).toBeGreaterThan(0)
  })

  it("ranks the found entry against the whole board, not a page of it", async () => {
    await submitRank(input({ handle: "fast", timeSeconds: 20 }))
    await submitRank(input({ handle: "slow", timeSeconds: 500 }))

    expect((await findEntryByHandle("slow"))?.rank).toBe(2)
  })

  it("says nothing rather than guessing when the handle is unknown", async () => {
    expect(await findEntryByHandle("nobody")).toBeNull()
  })
})

describe("paging the board", () => {
  it("ranks a later page against the whole board, not the page", async () => {
    // Page two starts at the 51st entry, and its rank must say so. Ranking a
    // slice on its own would restart every page at #1.
    for (let i = 0; i < 60; i++) {
      await submitRank(input({ handle: `p${i}`, timeSeconds: 30 + i }))
    }

    const second = await loadBoard(2)

    expect(second.page).toBe(2)
    expect(second.total).toBe(60)
    expect(second.entries).toHaveLength(10)
    expect(second.entries[0]?.rank).toBe(51)
  })

  it("keeps ties sharing a rank across a page boundary", async () => {
    for (let i = 0; i < 60; i++) {
      // Every entry ties with its neighbour, so 60 entries hold 30 ranks.
      await submitRank(input({ handle: `t${i}`, timeSeconds: 30 + Math.floor(i / 2) }))
    }

    const first = await loadBoard(1)
    expect(first.entries[0]?.rank).toBe(1)
    expect(first.entries[1]?.rank).toBe(1)
    expect(first.entries[2]?.rank).toBe(2)
    expect(first.total).toBe(60)
  })

  it("clamps a page past the end rather than failing", async () => {
    await submitRank(input({ handle: "only" }))
    const far = await loadBoard(99)
    expect(far.entries).toEqual([])
    expect(far.total).toBe(1)
  })
})

describe("the number the hero puts on the homepage", () => {
  it("headlines the fastest time on the board", async () => {
    // No second query behind this any more: every entry went through X, so
    // there is no unproven time to hold the headline back from.
    await submitRank(input({ handle: "quick", timeSeconds: 16 }))
    await submitRank(input({ handle: "ada", timeSeconds: 43 }))

    const board = await loadBoard(1)

    expect(board.counters.fastestSeconds).toBe(16)
    expect(board.counters.leaderHandle).toBe("quick")
    expect(board.entries[0]?.rank).toBe(1)
  })

  it("counts everyone sharing the headline time", async () => {
    await submitRank(input({ handle: "ada", timeSeconds: 43 }))
    await submitRank(input({ handle: "bob", timeSeconds: 43 }))

    expect((await loadBoard(1)).counters.leaderCount).toBe(2)
  })
})

describe("searching for a handle", () => {
  it("matches part of a handle, not only the whole of it", async () => {
    // Typed a character at a time, an exact-match lookup shows nothing until
    // the very last keystroke — which reads exactly like a broken search.
    await submitRank(input({ handle: "voidnomad", timeSeconds: 40 }))
    await submitRank(input({ handle: "voidsmith", timeSeconds: 50 }))
    await submitRank(input({ handle: "hyprfan", timeSeconds: 60 }))

    const found = await searchEntries("void")

    expect(found.map((e) => e.handle)).toEqual(["voidnomad", "voidsmith"])
    expect(found[0]?.rank).toBe(1)
  })

  it("ignores case and a leading at sign, as people type them", async () => {
    await submitRank(input({ handle: "voidnomad" }))
    expect((await searchEntries("@VoidNo")).map((e) => e.handle)).toEqual(["voidnomad"])
  })

  it("treats wildcards as characters, not as pattern syntax", async () => {
    // `%` and `_` are LIKE wildcards. Unescaped, "%" alone would return the
    // whole board, and "_" would match any single character.
    await submitRank(input({ handle: "voidnomad" }))

    expect(await searchEntries("%")).toEqual([])
    expect(await searchEntries("_oidnomad")).toEqual([])
  })

  it("asks for nothing on a query too short to narrow anything", async () => {
    await submitRank(input({ handle: "voidnomad" }))
    expect(await searchEntries("v")).toEqual([])
    expect(await searchEntries("")).toEqual([])
  })

  it("caps what it returns at a page, not at the whole board", async () => {
    // The results replace the board rather than sitting above it, so a page
    // is the right size — but a common fragment still must not return 10,000.
    for (let i = 0; i < 60; i++) {
      await submitRank(input({ handle: `voidone${i}`, timeSeconds: 30 + i }))
    }
    expect((await searchEntries("void")).length).toBe(50)
  })

  it("ranks each match against the whole board, not against the others", async () => {
    await submitRank(input({ handle: "fastest", timeSeconds: 20 }))
    await submitRank(input({ handle: "voidnomad", timeSeconds: 90 }))

    const found = await searchEntries("void")
    expect(found[0]?.rank).toBe(2)
  })
})

describe("a taken-down entry", () => {
  it("leaves the board, the count and the headline at once", async () => {
    await submitRank(input({ handle: "bad", timeSeconds: 20 }))
    await submitRank(input({ handle: "good", timeSeconds: 40 }))
    const { takedown } = await import("../src/server/takedown")

    await takedown("bad")
    const board = await loadBoard(1)

    expect(board.entries.map((e) => e.handle)).toEqual(["good"])
    expect(board.total).toBe(1)
    expect(board.counters.leaderHandle).toBe("good")
    expect(await findEntryByHandle("bad")).toBeNull()
    expect(await searchEntries("bad")).toEqual([])
  })
})
