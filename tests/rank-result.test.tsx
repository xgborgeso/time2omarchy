import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RankResult } from "@/components/RankResult"
import type { RankSuccess } from "@/lib/types"

/**
 * The moment after ranking.
 *
 * Four outcomes reach this card and each needs different words: a first
 * entry, a beaten time, a slower attempt that changed nothing, and an equal
 * time whose only effect was a new screenshot. Telling somebody "new best"
 * when their old one still stands is the one that would actually mislead.
 */
const base: RankSuccess = {
  ok: true,
  created: false,
  improved: false,
  keptBest: false,
  bestTimeSeconds: 43,
  entry: {
    rank: 3,
    handle: "ada",
    timeSeconds: 43,
    bootScreenUrl: "/a.png",
    bootScreenThumbUrl: null,
    cpuId: "amd-ryzen-7-9800x3d",
    ramGb: 32,
    storage: "nvme",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  board: {
    entries: [],
    activity: [],
    counters: {
      fastestSeconds: 26,
      medianSeconds: 43,
      leaderHandle: "bob",
      leaderCount: 1,
      entries: 9,
    },
    page: 1,
    perPage: 50,
    total: 9,
  },
}

/** Announced with role="status" so it is read out when it appears. */
function headline(placed: RankSuccess): string {
  render(<RankResult placed={placed} onAgain={() => {}} onClose={() => {}} />)
  return screen.getByRole("status").textContent ?? ""
}

describe("what the card says happened", () => {
  it("welcomes a first entry", () => {
    expect(headline({ ...base, created: true, improved: true })).toMatch(/on the board/i)
  })

  it("calls a beaten time a new best", () => {
    expect(headline({ ...base, improved: true })).toMatch(/new best/i)
  })

  it("says the old time still stands when the new one was slower", () => {
    // "New best" here would be a lie about the board somebody is looking at.
    expect(headline({ ...base, keptBest: true })).toMatch(/still stands/i)
  })

  it("describes an equal time by what actually changed", () => {
    // The rank did not move; the screenshot did.
    expect(headline(base)).toMatch(/boot screen updated/i)
  })
})
