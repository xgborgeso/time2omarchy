import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase } from "../src/server/pglite"
import { entries, uploads } from "../src/server/schema"

/**
 * What "Other" leaves behind, against real PGlite.
 *
 * The bucket used to record that the catalogue failed without recording what
 * it failed at, so the list could never be grown from it. These are the two
 * halves of the fix: the note is kept when it belongs to the escape hatch, and
 * it never reaches a page.
 */
const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))
vi.mock("../src/server/storage", () => ({
  publicUploadBase: () => null,
  deleteBootScreen: async () => {},
}))

const { submitRank: rankDirectly } = await import("../src/server/rank")
const { recordUpload } = await import("../src/server/uploads")
const { loadBoard } = await import("../src/server/board")
const { applyPromotions, cpuRequests, pendingPromotions, syncRequests, unnamedOtherCount } =
  await import("../src/server/cpu-requests")
const { readRequests } = await import("../src/server/cpu-decisions")

/** A decision log of its own per test, so none of them share a verdict. */
function log(body: unknown = { requests: [] }): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "t2o-log-")), "requests.json")
  writeFileSync(file, JSON.stringify(body))
  return file
}

type Over = Partial<Parameters<typeof rankDirectly>[0]> & { handle?: string }

function input({ handle, ...over }: Over = {}) {
  const who = handle ?? "ada"
  const identity = over.identity ?? { key: `x:${who}`, handle: who }
  const key = `${identity.key.replace(/[^a-z0-9]/gi, "")}-1.png`
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

async function rank(args: Parameters<typeof rankDirectly>[0]) {
  await recordUpload(args.bootScreenKey, args.identity.key)
  await recordUpload(args.bootScreenThumbKey, args.identity.key)
  return rankDirectly(args)
}

async function entryFor(handle: string) {
  const db = await opened
  const rows = await db.select().from(entries).where(eq(entries.handle, handle)).limit(1)
  return rows[0]
}

beforeEach(async () => {
  const db = await opened
  await db.delete(entries)
  await db.delete(uploads)
})

describe("naming a chip the catalogue does not have", () => {
  it("keeps the name beside the escape hatch", async () => {
    await rank(input({ cpuId: "other", cpuOther: "Intel(R) N100" }))

    const [request] = await cpuRequests()
    expect(request?.name).toBe("Intel(R) N100")
    expect(request?.entries).toBe(1)
  })

  it("refuses to keep one beside a chip that is in the catalogue", async () => {
    // A note left next to a real id would contradict it, and would go on
    // asking for a chip the list already has.
    await rank(input({ cpuId: "amd-ryzen-7-9800x3d", cpuOther: "Intel N100" }))

    expect(await cpuRequests()).toHaveLength(0)
  })

  it("never puts the name on the board", async () => {
    // Written by strangers, so it stays off every surface a visitor can see —
    // which is what keeps it clear of the moderation queue boot screens need.
    await rank(input({ cpuId: "other", cpuOther: "Intel(R) N100" }))

    const board = await loadBoard()
    expect(JSON.stringify(board)).not.toContain("N100")
  })

  it("counts two spellings of one chip as one request", async () => {
    // Otherwise the same missing chip arrives as several entries a maintainer
    // has to notice are the same before acting on any of them.
    await rank(input({ handle: "ada", cpuId: "other", cpuOther: "AMD Ryzen 5 7530U" }))
    await rank(
      input({
        handle: "bob",
        cpuId: "other",
        cpuOther: "AMD Ryzen 5 7530U w/ Radeon Graphics",
      }),
    )

    const requests = await cpuRequests()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.entries).toBe(2)
  })

  it("flags a request the catalogue can already answer", async () => {
    // Not a chip to add: the list has it and the search is what missed, which
    // is a matcher fix rather than a new line.
    await rank(input({ cpuId: "other", cpuOther: "Ryzen 9 7950X" }))

    expect((await cpuRequests())[0]?.matches).toContain("AMD Ryzen 9 7950X")
  })

  it("counts the entries that named nothing at all", async () => {
    // The field is optional, so this is the size of what is still unknown.
    await rank(input({ handle: "ada", cpuId: "other", cpuOther: null }))
    await rank(input({ handle: "bob", cpuId: "other", cpuOther: "Intel N150" }))

    expect(await unnamedOtherCount()).toBe(1)
    expect(await cpuRequests()).toHaveLength(1)
  })
})

describe("folding requests into the decision log", () => {
  it("adds what is new, all pending", async () => {
    await rank(input({ cpuId: "other", cpuOther: "Intel(R) N100" }))
    const file = log()

    const { added } = await syncRequests(file)
    expect(added).toEqual(["Intel(R) N100"])
    expect(readRequests(file).requests[0]).toMatchObject({
      query: "intel n100",
      reported: "Intel(R) N100",
      status: "pending",
    })
  })

  it("keeps a verdict when the normalizer changes under it", async () => {
    // The key is whatever the normalizer produces today, and it changes:
    // stripping "proc" re-keyed every stored decision at a stroke. Derived
    // from the reported spelling on each read, a rejection survives that;
    // trusted from the file, it would quietly re-open.
    await rank(input({ cpuId: "other", cpuOther: "AMD AI Proc" }))
    const file = log({
      requests: [
        {
          query: "stale-key-from-an-older-normalizer",
          reported: "AMD AI Proc",
          entries: 1,
          lastSeen: "2026-09-06",
          status: "rejected",
          note: "Cannot tell which Ryzen AI part.",
        },
      ],
    })

    const { added } = await syncRequests(file)
    expect(added).toEqual([])
    const [request] = readRequests(file).requests
    expect(request?.status).toBe("rejected")
    // And it is re-filed under the key the normalizer produces now.
    expect(request?.query).toBe("amd ai")
  })

  it("never re-opens something already decided", async () => {
    // A rejection is permanent knowledge. Re-listing it every week would make
    // the queue a thing to ignore rather than a thing to work through.
    await rank(input({ cpuId: "other", cpuOther: "AMD AI Proc" }))
    const file = log({
      requests: [
        {
          query: "amd ai proc",
          reported: "AMD AI Proc",
          entries: 1,
          lastSeen: "2026-09-06",
          status: "rejected",
          note: "Cannot tell which Ryzen AI part.",
        },
      ],
    })

    const { added } = await syncRequests(file)
    expect(added).toEqual([])
    expect(readRequests(file).requests[0]?.status).toBe("rejected")
  })
})

describe("promoting entries onto a chip that now exists", () => {
  const approved = () =>
    log({
      requests: [
        {
          query: "intel n100",
          reported: "Intel(R) N100",
          entries: 1,
          lastSeen: "2026-09-06",
          status: "approved",
          cpu: { vendor: "Intel", family: "Core N-series", name: "N100" },
        },
      ],
    })

  it("finds the entries an approval covers, without touching them", async () => {
    // Reading is not applying: the catalogue growing and somebody's row being
    // rewritten are two decisions, and only the second one is irreversible.
    await rank(input({ cpuId: "other", cpuOther: "Intel(R) N100" }))

    expect(await pendingPromotions(approved())).toEqual([
      { cpuId: "intel-n100", handles: ["ada"] },
    ])
    expect((await entryFor("ada"))?.cpuId).toBe("other")
  })

  it("matches two spellings of the same chip", async () => {
    await rank(input({ handle: "ada", cpuId: "other", cpuOther: "Intel(R) N100" }))
    await rank(
      input({ handle: "bob", cpuId: "other", cpuOther: "Intel N100 CPU @ 3.40GHz" }),
    )

    const [promotion] = await pendingPromotions(approved())
    expect(promotion?.handles.sort()).toEqual(["ada", "bob"])
  })

  it("moves them and clears the note they no longer need", async () => {
    await rank(input({ cpuId: "other", cpuOther: "Intel(R) N100" }))

    const moved = await applyPromotions(await pendingPromotions(approved()))
    expect(moved).toBe(1)

    const row = await entryFor("ada")
    expect(row?.cpuId).toBe("intel-n100")
    expect(row?.cpuOther).toBeNull()
  })

  it("leaves a rejected chip where it is", async () => {
    await rank(input({ cpuId: "other", cpuOther: "AMD AI Proc" }))
    const file = log({
      requests: [
        {
          query: "amd ai proc",
          reported: "AMD AI Proc",
          entries: 1,
          lastSeen: "2026-09-06",
          status: "rejected",
          note: "Cannot tell which Ryzen AI part.",
        },
      ],
    })

    expect(await pendingPromotions(file)).toEqual([])
    expect((await entryFor("ada"))?.cpuId).toBe("other")
  })
})

describe("keeping a pending request current", () => {
  it("refreshes the count and the date while it still waits on a person", async () => {
    // The figures are what a verdict is judged on, so a request nobody has
    // ruled on yet has to carry today's, not the ones from its first sync.
    await rank(input({ handle: "ada", cpuId: "other", cpuOther: "Intel(R) N100" }))
    const file = log()
    await syncRequests(file)
    expect(readRequests(file).requests[0]).toMatchObject({ entries: 1 })

    await rank(input({ handle: "bob", cpuId: "other", cpuOther: "Intel N100" }))
    await syncRequests(file)

    const [request] = readRequests(file).requests
    expect(request).toMatchObject({ entries: 2, status: "pending" })
  })

  it("freezes the figures on anything already decided", async () => {
    // Refreshing a rejected chip's count would churn the diff every week to
    // say nothing, and the count that mattered is the one it had when
    // somebody looked at it.
    await rank(input({ handle: "ada", cpuId: "other", cpuOther: "Intel(R) N100" }))
    const file = log({
      requests: [
        {
          query: "intel n100",
          reported: "Intel(R) N100",
          entries: 99,
          lastSeen: "2026-01-01",
          status: "rejected",
          note: "Decided already.",
        },
      ],
    })

    await syncRequests(file)
    expect(readRequests(file).requests[0]).toMatchObject({
      entries: 99,
      lastSeen: "2026-01-01",
    })
  })

  it("moves nothing when no decision approves anything", async () => {
    await rank(input({ cpuId: "other", cpuOther: "Intel(R) N100" }))
    expect(await pendingPromotions(log())).toEqual([])
  })

  it("writes nothing when there is nothing to move", async () => {
    expect(await applyPromotions([])).toBe(0)
    expect(await applyPromotions([{ cpuId: "intel-n100", handles: [] }])).toBe(0)
  })
})

describe("names that survive the column but not the normalizer", () => {
  it("skips one that normalizes to nothing at all", async () => {
    // The schema trims and nulls an empty box, so this can only be written
    // straight into the table — but a name of only punctuation reduces to an
    // empty key, and an empty key would group every such row together.
    await rank(input({ cpuId: "other", cpuOther: "Intel(R) N100" }))
    const db = await opened
    await db.update(entries).set({ cpuOther: "((( )))" })

    expect(await cpuRequests()).toEqual([])
  })

  it("leaves a row an approval does not name where it is", async () => {
    // One chip approved does not move an entry that asked for another.
    await rank(input({ handle: "ada", cpuId: "other", cpuOther: "Intel(R) N150" }))
    const file = log({
      requests: [
        {
          query: "intel n100",
          reported: "Intel(R) N100",
          entries: 1,
          lastSeen: "2026-09-06",
          status: "approved",
          cpu: { vendor: "Intel", family: "Core N-series", name: "N100" },
        },
      ],
    })

    expect(await pendingPromotions(file)).toEqual([])
  })
})
