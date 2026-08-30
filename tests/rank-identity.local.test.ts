import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Identity } from "../src/lib/identity"
import { openDatabase } from "../src/server/pglite"
import { entries, uploads } from "../src/server/schema"

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

/** Keys handed to storage for deletion, so the leak is testable. */
const discarded: string[] = []
vi.mock("../src/server/storage", () => ({
  publicUploadBase: () => null,
  deleteBootScreen: async (key: string | null) => {
    if (key) discarded.push(key)
  },
}))

const { submitRank: rankDirectly } = await import("../src/server/rank")
const { recordUpload } = await import("../src/server/uploads")
const { findEntryByHandle, loadBoard, searchEntries } = await import("../src/server/board")

const ADA: Identity = { key: "x:1665012345678901234", handle: "ada" }

type Over = Partial<Parameters<typeof submitRank>[0]> & { handle?: string }

/**
 * One account per handle unless a test says otherwise.
 *
 * The url is derived from the key rather than set beside it: the server
 * refuses a pair that disagrees, so hand-writing both is a way to write a test
 * that fails for the wrong reason.
 */
function input({ handle, bootScreenKey, ...over }: Over = {}) {
  const who = handle ?? "ada"
  const identity = over.identity ?? { key: `x:${who}`, handle: who }
  // Derived from the account, not the handle: two identities sharing a default
  // key would have the second refused for not owning the first one's upload,
  // which is the rule working rather than the test failing.
  const key = bootScreenKey ?? `${identity.key.replace(/[^a-z0-9]/gi, "")}-1.png`
  return {
    timeSeconds: 43,
    bootScreenUrl: `/uploads/${key}`,
    bootScreenKey: key,
    bootScreenThumbUrl: `/uploads/thumb-${key}`,
    bootScreenThumbKey: `thumb-${key}`,
    cpuId: "amd-ryzen-7-9800x3d",
    ramGb: 32,
    storage: "nvme",
    identity,
    ...over,
  }
}

beforeEach(async () => {
  const db = await opened
  await db.delete(entries)
  await db.delete(uploads)
  discarded.length = 0
})

/**
 * Ranks the way the app does: upload first, then submit.
 *
 * Ranking refuses a key its caller did not upload, so a test that submits
 * without uploading is testing the refusal rather than what it meant to.
 * Recording is `onConflictDoNothing`, which mirrors reality — a key already
 * belonging to somebody else stays theirs, so the ownership tests below can
 * call this and still be refused.
 */
async function submitRank(args: Parameters<typeof rankDirectly>[0]) {
  await recordUpload(args.bootScreenKey, args.identity.key)
  await recordUpload(args.bootScreenThumbKey, args.identity.key)
  return rankDirectly(args)
}

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

  it("throws away a boot screen the board did not take", async () => {
    // Every rank uploads before it knows whether the time will stand, so a
    // slower attempt leaves a file nothing points at. Two of those is two
    // orphans on a storage tier measured in gigabytes.
    await submitRank(input({ identity: ADA, timeSeconds: 43, bootScreenKey: "kept" }))
    await submitRank(input({ identity: ADA, timeSeconds: 90, bootScreenKey: "slower" }))

    // Both halves of the rejected pair, or the thumbnail outlives its screen.
    expect(discarded).toEqual(["slower", "thumb-slower"])
    expect((await entryFor("ada"))?.bootScreenKey).toBe("kept")
  })

  it("never deletes a key an entry still points at", async () => {
    // Keys are public: every boot screen url on the board ends in one. A
    // submitted key must not be able to remove somebody else's file.
    await submitRank(input({ identity: ADA, timeSeconds: 43, bootScreenKey: "mine" }))
    await submitRank(
      input({
        identity: { key: "x:bob", handle: "bob" },
        timeSeconds: 99,
        bootScreenKey: "mine",
      }),
    )

    expect(discarded).not.toContain("mine")
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

describe("a boot screen somebody else uploaded", () => {
  it("cannot be attached to your own entry", async () => {
    // Every key on the board is public — it is the last segment of the boot
    // screen url the board hands out. Proving the url is on our host is not
    // the same as proving the caller uploaded the file behind it.
    await submitRank(input({ handle: "victim", bootScreenKey: "victim-shot" }))

    const result = await submitRank(
      input({
        identity: { key: "x:attacker", handle: "attacker" },
        bootScreenKey: "victim-shot",
      }),
    )

    expect(result.ok).toBe(false)
    // ...and the victim's row is untouched.
    expect((await entryFor("victim"))?.bootScreenKey).toBe("victim-shot")
  })

  it("cannot be deleted by re-ranking over it", async () => {
    // The attack that made this HIGH: claim a victim's key on one rank, then
    // rank again so the replace path deletes "the previous object". The file
    // is the only evidence behind a ranked time and deletion is permanent.
    await submitRank(input({ handle: "victim", bootScreenKey: "victim-shot" }))

    // Claim the victim's key first, so the attacker's row holds it...
    await submitRank(
      input({
        identity: { key: "x:attacker", handle: "attacker" },
        bootScreenKey: "victim-shot",
      }),
    )
    discarded.length = 0

    // ...then rank again, so the replace path deletes "the previous object".
    await submitRank(
      input({
        identity: { key: "x:attacker", handle: "attacker" },
        bootScreenKey: "attacker-own",
      }),
    )

    expect(discarded).not.toContain("victim-shot")
    expect(discarded).not.toContain("thumb-victim-shot")
  })

  it("still deletes your own replaced screen, which is the point", async () => {
    await submitRank(input({ identity: ADA, bootScreenKey: "old", timeSeconds: 60 }))
    discarded.length = 0

    await submitRank(input({ identity: ADA, bootScreenKey: "new", timeSeconds: 40 }))

    expect(discarded).toEqual(["old", "thumb-old"])
    expect((await entryFor("ada"))?.bootScreenKey).toBe("new")
  })
})

describe("moderating one entry", () => {
  it("does not delete a file another entry still points at", async () => {
    // An entry can hold a key it did not upload only if something went wrong,
    // but purging is permanent — so the check is worth having either way.
    await submitRank(input({ handle: "one", bootScreenKey: "shared" }))
    const db = await opened
    await db.insert(entries).values({
      id: crypto.randomUUID(),
      handle: "two",
      timeSeconds: 99,
      bootScreenUrl: "/uploads/shared",
      bootScreenKey: "shared",
      identityKey: "x:two",
      cpuId: "other",
      ramGb: 16,
      storage: "ssd",
    })
    discarded.length = 0
    const { takedown } = await import("../src/server/takedown")

    await takedown("one", true)

    expect(discarded).not.toContain("shared")
  })

  it("still purges a file nothing else is using", async () => {
    await submitRank(input({ handle: "alone", bootScreenKey: "only-mine" }))
    discarded.length = 0
    const { takedown } = await import("../src/server/takedown")

    await takedown("alone", true)

    expect(discarded).toContain("only-mine")
  })
})
