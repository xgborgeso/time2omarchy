import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase } from "../src/server/pglite"
import { entries } from "../src/server/schema"

/**
 * Ranking against real PGlite, with identity handed in the way the router
 * hands it: resolved from the session before `submitRank` is ever called.
 *
 * An in-memory database per file, swapped in for the on-disk dev one — the
 * board, the counters and the rank path all read through the same `getDb`.
 */
const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))

const { submitRank, claimEntry } = await import("../src/server/rank")
const { findEntryByHandle, loadBoard, searchEntries } = await import("../src/server/board")

const ADA = { key: "x:1665012345678901234", handle: "ada" }

function input(over: Partial<Parameters<typeof submitRank>[0]> = {}) {
  return {
    handle: "ada",
    timeSeconds: 43,
    bootScreenUrl: "/uploads/ada-1.png",
    cpuId: "amd-ryzen-7-9800x3d",
    ramGb: 32,
    storage: "nvme",
    identity: null,
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

describe("ranking with an X identity", () => {
  it("marks an entry verified and keys it to the account id", async () => {
    const result = await submitRank(input({ identity: ADA }))

    expect(result.ok).toBe(true)
    const row = await entryFor("ada")
    expect(row?.verified).toBe(true)
    expect(row?.identityKey).toBe("x:1665012345678901234")
  })

  it("leaves an entry unverified when nobody is signed in", async () => {
    // Signing in is not a toll: an unverified entry still opens a row.
    await submitRank(input())

    const row = await entryFor("ada")
    expect(row?.verified).toBe(false)
    expect(row?.identityKey).toBeNull()
  })

  it("ignores an identity that does not match the handle being ranked", async () => {
    // There is no signed-in state in this product, only proof of one entry.
    // Proof of @ada says nothing about an entry called @bob, so @bob opens
    // exactly as a guest entry would.
    await submitRank(input({ handle: "bob", identity: ADA }))

    const bob = await entryFor("bob")
    expect(bob?.verified).toBe(false)
    expect(bob?.identityKey).toBeNull()
  })

  it("claims an entry someone else opened under your handle", async () => {
    // The whole point of the badge: squatting an early entry buys nothing.
    await submitRank(input({ timeSeconds: 300 }))
    expect((await entryFor("ada"))?.verified).toBe(false)

    const result = await submitRank(input({ timeSeconds: 44, identity: ADA }))

    expect(result.ok).toBe(true)
    const row = await entryFor("ada")
    expect(row?.verified).toBe(true)
    expect(row?.timeSeconds).toBe(44)
  })

  it("refuses an unverified entry that would overwrite a verified entry", async () => {
    await submitRank(input({ timeSeconds: 43, identity: ADA }))
    const result = await submitRank(input({ timeSeconds: 20 }))

    expect(result.ok).toBe(false)
    expect((await entryFor("ada"))?.timeSeconds).toBe(43)
  })

  it("follows a renamed account to its existing entry", async () => {
    // X handles can be changed and re-registered. The account id cannot, so a
    // rename must move the row rather than open a second one.
    await submitRank(input({ identity: ADA }))
    await submitRank(
      input({
        handle: "adalove",
        timeSeconds: 40,
        identity: { ...ADA, handle: "adalove" },
      }),
    )

    const db = await opened
    expect(await db.select().from(entries)).toHaveLength(1)
    const row = await entryFor("adalove")
    expect(row?.timeSeconds).toBe(40)
    expect(row?.identityKey).toBe(ADA.key)
  })
})

describe("claiming an entry ranked as a guest", () => {
  it("takes over the entry that already carries your handle", async () => {
    // Ranked first, signed in later. Claiming must not ask for the time and
    // the boot screen a second time — they are already on the board.
    await submitRank(input({ timeSeconds: 61 }))

    const result = await claimEntry(ADA, "ada")

    expect(result.ok).toBe(true)
    const row = await entryFor("ada")
    expect(row?.verified).toBe(true)
    expect(row?.identityKey).toBe(ADA.key)
    // Untouched: a claim proves who owns the row, it does not restate it.
    expect(row?.timeSeconds).toBe(61)
    expect(row?.bootScreenUrl).toBe("/uploads/ada-1.png")
  })

  it("says there is nothing to claim rather than inventing an entry", async () => {
    const result = await claimEntry(ADA, "ada")

    expect(result.ok).toBe(false)
    expect(await entryFor("ada")).toBeUndefined()
  })

  it("leaves an entry that is already verified alone", async () => {
    await submitRank(input({ identity: ADA }))
    const result = await claimEntry(ADA, "ada")

    expect(result.ok).toBe(false)
    expect((await entryFor("ada"))?.identityKey).toBe(ADA.key)
  })

  it("refuses an entry verified by a different account", async () => {
    // X handles can be reassigned; the entry belongs to whoever proved it.
    await submitRank(input({ identity: ADA }))
    const result = await claimEntry({ key: "x:99", handle: "ada" }, "ada")

    expect(result.ok).toBe(false)
    expect((await entryFor("ada"))?.identityKey).toBe(ADA.key)
  })
})

describe("claiming an entry that is not yours", () => {
  it("cannot touch it, because the entry to claim is never sent", async () => {
    // Signed in as @bob, clicking Claim on @ada's entry. The request carries
    // no handle at all — the server only ever looks up the caller's own.
    await submitRank(input({ handle: "ada" }))

    const result = await claimEntry({ key: "x:777", handle: "bob" }, "ada")

    expect(result.ok).toBe(false)
    // Explains itself without naming either account: the person knows which
    // entry they clicked, and the entry's owner is not theirs to be told.
    if (!result.ok) {
      expect(result.error).toMatch(/doesn't belong to you/i)
      expect(result.error).not.toContain("@")
    }
    const ada = await entryFor("ada")
    expect(ada?.verified).toBe(false)
    expect(ada?.identityKey).toBeNull()
  })

  it("claims your own entry instead, when you have one", async () => {
    // The only entry a session can ever reach is the one under its own handle.
    await submitRank(input({ handle: "ada" }))
    await submitRank(input({ handle: "bob" }))

    const result = await claimEntry({ key: "x:777", handle: "bob" }, "bob")

    expect(result.ok).toBe(true)
    expect((await entryFor("bob"))?.identityKey).toBe("x:777")
    expect((await entryFor("ada"))?.identityKey).toBeNull()
  })

  it("cannot take an entry by renaming into a handle someone already holds", async () => {
    // X frees a handle when it is changed. Whoever proved an entry keeps it.
    await submitRank(input({ handle: "ada", identity: ADA }))
    const result = await claimEntry({ key: "x:777", handle: "ada" }, "ada")

    expect(result.ok).toBe(false)
    expect((await entryFor("ada"))?.identityKey).toBe(ADA.key)
  })
})

describe("finding one entry among many", () => {
  it("returns an entry by handle whatever its rank", async () => {
    // The board shows the top 100. At ten thousand entries that is the whole
    // problem: someone at #4000 cannot see their own entry, and every claim
    // affordance goes with it.
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
  it("headlines the fastest claimed time, not the fastest typed one", async () => {
    // The hero number is the marketing surface. An unclaimed entry can hold
    // rank 1 on the board — that is the rule — but it must not become the
    // figure the homepage quotes, because nothing stands behind it.
    await submitRank(input({ handle: "faker", timeSeconds: 16 }))
    await submitRank(input({ handle: "ada", timeSeconds: 43, identity: ADA }))

    const board = await loadBoard(1)

    expect(board.counters.fastestSeconds).toBe(43)
    expect(board.counters.leaderHandle).toBe("ada")
    // The board itself still ranks by time alone.
    expect(board.entries[0]?.handle).toBe("faker")
    expect(board.entries[0]?.rank).toBe(1)
  })

  it("falls back to the fastest overall while nobody has claimed anything", async () => {
    // A brand-new board has no claimed entry to quote, and an empty hero
    // above fifty real entries would read as broken.
    await submitRank(input({ handle: "first", timeSeconds: 61 }))

    const board = await loadBoard(1)

    expect(board.counters.fastestSeconds).toBe(61)
    expect(board.counters.leaderHandle).toBe("first")
  })

  it("counts only the claimed entries sharing the headline time", async () => {
    await submitRank(input({ handle: "ada", timeSeconds: 43, identity: ADA }))
    await submitRank(input({ handle: "bob", timeSeconds: 43 }))

    const board = await loadBoard(1)

    expect(board.counters.leaderCount).toBe(1)
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
