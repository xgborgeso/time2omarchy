import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase } from "../src/server/pglite"
import { entries, uploads } from "../src/server/schema"

/**
 * The other side of every fork on the server.
 *
 * Empty tables, keys nobody uploaded, an address the proxy never gave us. Each
 * is a state the app can genuinely be in and none is easy to arrange through
 * the routes that normally produce it.
 */
const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))
vi.mock("../src/server/storage", () => ({
  publicUploadBase: () => null,
  deleteBootScreen: async () => {},
}))

const { loadBoard, loadStats, findEntryByHandle } = await import("../src/server/board")
const { rankedToday } = await import("../src/server/stats")
const { ownsUploads, recordUpload } = await import("../src/server/uploads")
const { reporterKeyFor, reportEntry } = await import("../src/server/reports")
const { submitRank } = await import("../src/server/rank")

beforeEach(async () => {
  const db = await opened
  await db.delete(entries)
  await db.delete(uploads)
})

async function rank(handle: string, timeSeconds = 43, ageDays = 0) {
  const identity = { key: `x:${handle}`, handle }
  const key = `${handle}-1.png`
  await recordUpload(key, identity.key)
  await recordUpload(`thumb-${key}`, identity.key)
  const result = await submitRank({
    timeSeconds,
    bootScreenUrl: `/uploads/${key}`,
    bootScreenKey: key,
    bootScreenThumbUrl: `/uploads/thumb-${key}`,
    bootScreenThumbKey: `thumb-${key}`,
    cpuId: "amd-ryzen-7-9800x3d",
    ramGb: 32,
    storage: "nvme",
    identity,
  })
  if (ageDays > 0) {
    const { eq } = await import("drizzle-orm")
    const db = await opened
    const when = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000)
    await db.update(entries).set({ updatedAt: when }).where(eq(entries.handle, handle))
  }
  return result
}

describe("reading an empty board", () => {
  it("counts nothing rather than failing on a missing row", async () => {
    const board = await loadBoard()
    expect(board.total).toBe(0)
    expect(board.counters.entries).toBe(0)
    expect(board.counters.leaderCount).toBe(0)
    expect(board.counters.leaderHandle).toBeNull()
  })

  it("has nobody ranked today", async () => {
    expect(await rankedToday()).toBe(0)
  })

  it("finds nobody by a handle that was never on it", async () => {
    expect(await findEntryByHandle("nobody")).toBeNull()
  })
})

describe("the daily trend", () => {
  it("leaves out entries older than the window it draws", async () => {
    // Fourteen days, so anything behind that is not a gap in the chart — it
    // is outside the chart.
    await rank("ada", 43, 40)
    await rank("bob", 51, 1)

    const stats = await loadStats()
    const counted = stats.daily.reduce((n, day) => n + day.count, 0)
    expect(counted).toBe(1)
    expect(stats.entries).toBe(2)
  })
})

describe("a page beyond the board", () => {
  it("clamps a page number below one", async () => {
    // The router's schema stops this, but `loadBoard` is called directly by
    // the page's own prefetch too.
    await rank("ada")
    expect((await loadBoard(0)).page).toBe(1)
    expect((await loadBoard(-5)).page).toBe(1)
  })

  it("answers an empty page rather than failing", async () => {
    await rank("ada")
    const board = await loadBoard(9)
    expect(board.entries).toEqual([])
    expect(board.total).toBe(1)
  })
})

describe("ownsUploads", () => {
  it("has nothing to disprove when no keys were named", async () => {
    expect(await ownsUploads("x:ada", [])).toBe(true)
  })

  it("refuses a key nobody recorded", async () => {
    expect(await ownsUploads("x:ada", ["never-uploaded.png"])).toBe(false)
  })

  it("refuses a key somebody else recorded", async () => {
    await recordUpload("shared.png", "x:bob")
    expect(await ownsUploads("x:ada", ["shared.png"])).toBe(false)
  })

  it("takes the same key named twice as one", async () => {
    await recordUpload("a.png", "x:ada")
    expect(await ownsUploads("x:ada", ["a.png", "a.png"])).toBe(true)
  })
})

describe("who a report is attributed to", () => {
  it("gives an unknown caller an identity of their own", async () => {
    // `clientKeyFrom` yields the literal "unknown" with no trusted proxy
    // header, and hashing that gave every caller the same key — which capped
    // each entry at one report forever.
    const a = reporterKeyFor("unknown")
    const b = reporterKeyFor("unknown")
    expect(a).not.toBe(b)

    expect(reporterKeyFor(null)).not.toBe(reporterKeyFor(null))
    expect(reporterKeyFor("   ")).not.toBe(reporterKeyFor("   "))
  })

  it("gives the same address the same key", () => {
    expect(reporterKeyFor("203.0.113.9")).toBe(reporterKeyFor("203.0.113.9"))
  })

  it("counts a report against an entry that exists", async () => {
    await rank("ada")
    expect(await reportEntry("ada", "203.0.113.9")).toEqual({ ok: true })
  })
})

describe("a rank whose entry is not on the page that came back", () => {
  it("still describes the entry it just wrote", async () => {
    // The board is paginated at fifty, so somebody slow enough lands off page
    // one and the result has to be built from the row rather than found on it.
    for (let n = 0; n < 51; n += 1) await rank(`fast${n}`, 30 + n)
    const slow = await rank("zed", 9999)

    expect(slow.ok).toBe(true)
    if (slow.ok) {
      expect(slow.entry.handle).toBe("zed")
      // Built from the row, so it carries no rank of its own.
      expect(slow.entry.rank).toBe(0)
    }
  })

  it("does the same when a slower attempt keeps the older time", async () => {
    for (let n = 0; n < 51; n += 1) await rank(`fast${n}`, 30 + n)
    await rank("zed", 9000)
    const slower = await rank("zed", 9999)

    expect(slower.ok).toBe(true)
    if (slower.ok) {
      expect(slower.keptBest).toBe(true)
      expect(slower.entry.handle).toBe("zed")
    }
  })
})

describe("the trusted proxy header", () => {
  it("is null with nothing in front, and named when there is", async () => {
    // Unset, every caller shares one bucket — the safe default, but no
    // defence at all against one determined visitor.
    vi.resetModules()
    vi.stubEnv("TRUSTED_IP_HEADER", "")
    expect((await import("../src/server/env")).TRUSTED_IP_HEADER).toBeNull()

    vi.resetModules()
    vi.stubEnv("TRUSTED_IP_HEADER", " cf-connecting-ip ")
    expect((await import("../src/server/env")).TRUSTED_IP_HEADER).toBe("cf-connecting-ip")
    vi.unstubAllEnvs()
  })
})

describe("improving a time from off the first page", () => {
  it("describes the entry it replaced, wherever the board put it", async () => {
    // The replace path reloads the board and looks for itself on it. Somebody
    // still slower than fifty other people is not on page one.
    for (let n = 0; n < 51; n += 1) await rank(`fast${n}`, 30 + n)
    await rank("zed", 9999)
    const better = await rank("zed", 9000)

    expect(better.ok).toBe(true)
    if (better.ok) {
      expect(better.improved).toBe(true)
      expect(better.entry.handle).toBe("zed")
    }
  })

  it("carries the rank it found when the entry is on the page", async () => {
    // The same fallback, taken the other way: a fast time is on page one, so
    // `toEntry` finds the rank rather than defaulting it.
    await rank("ada", 43)
    const better = await rank("ada", 30)

    expect(better.ok).toBe(true)
    if (better.ok) expect(better.entry.rank).toBeGreaterThan(0)
  })
})
