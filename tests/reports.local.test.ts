import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase } from "../src/server/pglite"
import { entries, reports } from "../src/server/schema"

const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))

const { reportEntry, openReports } = await import("../src/server/reports")

beforeEach(async () => {
  const db = await opened
  await db.delete(reports)
  await db.delete(entries)
  await db.insert(entries).values({
    id: crypto.randomUUID(),
    handle: "flagged",
    timeSeconds: 30,
    bootScreenUrl: "/uploads/x.png",
    identityKey: "x:flagged",
    cpuId: "other",
    ramGb: 16,
    storage: "ssd",
  })
})

describe("reporting an entry", () => {
  it("counts one report per person, not one per entry ever", async () => {
    // The bug this replaces: the reporter key came from `clientKey`, which is
    // the constant "unknown" unless a trusted proxy header is configured. Every
    // reporter hashed to the same value, so the unique index on
    // (entry_id, reporter_key) silently dropped every report after the first.
    await reportEntry("flagged", "visitor-a")
    await reportEntry("flagged", "visitor-b")
    await reportEntry("flagged", "visitor-c")

    expect((await openReports())[0]?.reports).toBe(3)
  })

  it("still counts one person once, however often they press it", async () => {
    await reportEntry("flagged", "visitor-a")
    await reportEntry("flagged", "visitor-a")
    await reportEntry("flagged", "visitor-a")

    expect((await openReports())[0]?.reports).toBe(1)
  })

  it("stores no visitor id anybody could read back", async () => {
    await reportEntry("flagged", "visitor-a")

    const db = await opened
    const [row] = await db.select({ key: reports.reporterKey }).from(reports)
    expect(row?.key).not.toContain("visitor-a")
  })

  it("answers a hidden entry the same as one that never existed", async () => {
    // Otherwise the response tells anyone who asks which handles were removed.
    const db = await opened
    await db.update(entries).set({ hiddenAt: new Date() })

    const hidden = await reportEntry("flagged", "visitor-a")
    const missing = await reportEntry("nobody-here", "visitor-a")

    expect(hidden).toEqual(missing)
  })
})
