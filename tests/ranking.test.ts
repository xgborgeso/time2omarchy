import { describe, expect, it } from "vitest"
import { rankEntries } from "@/lib/ranking"

/** Shorthand row builder; createdAt only matters where a test says so. */
function row(
  handle: string,
  timeSeconds: number,
  verified = false,
  createdAt = "2026-01-01T00:00:00.000Z",
) {
  return { handle, timeSeconds, verified, createdAt }
}

describe("rankEntries", () => {
  it("numbers distinct times in order", () => {
    const ranked = rankEntries([row("linus", 51), row("ada", 42), row("ken", 60)])
    expect(ranked.map((e) => [e.handle, e.rank])).toEqual([
      ["ada", 1],
      ["linus", 2],
      ["ken", 3],
    ])
  })

  it("gives an equal time an equal rank", () => {
    const ranked = rankEntries([row("ada", 42), row("grace", 42)])
    expect(ranked.map((e) => e.rank)).toEqual([1, 1])
  })

  it("leaves no gap after a tie", () => {
    // Dense ranking: the number counts distinct times, so two firsts are
    // followed by second rather than third.
    const ranked = rankEntries([row("ada", 42), row("grace", 42), row("linus", 51)])
    expect(ranked.map((e) => e.rank)).toEqual([1, 1, 2])
  })

  it("leaves no gap after a three-way tie either", () => {
    const ranked = rankEntries([
      row("ada", 42),
      row("grace", 42),
      row("linus", 42),
      row("ken", 51),
    ])
    expect(ranked.map((e) => e.rank)).toEqual([1, 1, 1, 2])
  })

  it("ends at the number of distinct times", () => {
    const ranked = rankEntries([
      row("a", 42),
      row("b", 42),
      row("c", 51),
      row("d", 64),
      row("e", 64),
    ])
    expect(ranked.at(-1)?.rank).toBe(3)
  })

  it("lists the verified entry first among equal times", () => {
    const ranked = rankEntries([row("grace", 42, false), row("ada", 42, true)])
    expect(ranked.map((e) => e.handle)).toEqual(["ada", "grace"])
  })

  it("does not let verification change the rank number itself", () => {
    // Rank is by time alone. Proof only decides who is listed first among equals.
    const ranked = rankEntries([row("grace", 42, false), row("ada", 42, true)])
    expect(ranked.map((e) => e.rank)).toEqual([1, 1])
  })

  it("never lets a verified entry outrank a faster unverified one", () => {
    const ranked = rankEntries([row("grace", 42, false), row("ada", 51, true)])
    expect(ranked.map((e) => [e.handle, e.rank])).toEqual([
      ["grace", 1],
      ["ada", 2],
    ])
  })

  it("breaks a tie of equal proof by who got there first", () => {
    const ranked = rankEntries([
      row("late", 42, true, "2026-03-01T00:00:00.000Z"),
      row("early", 42, true, "2026-02-01T00:00:00.000Z"),
    ])
    expect(ranked.map((e) => e.handle)).toEqual(["early", "late"])
  })

  it("returns an empty list unchanged", () => {
    expect(rankEntries([])).toEqual([])
  })

  it("does not mutate the input", () => {
    const rows = [row("linus", 51), row("ada", 42)]
    rankEntries(rows)
    expect(rows.map((e) => e.handle)).toEqual(["linus", "ada"])
  })
})
