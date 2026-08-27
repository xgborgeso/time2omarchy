import { describe, expect, it } from "vitest"
import {
  axisPosition,
  bucketTimes,
  dailySeries,
  gapToLeader,
  percentileRank,
  TIME_BUCKETS,
} from "../src/lib/stats"

describe("bucketTimes", () => {
  it("returns every bucket even when empty", () => {
    const buckets = bucketTimes([])
    expect(buckets).toHaveLength(TIME_BUCKETS.length)
    expect(buckets.every((b) => b.count === 0)).toBe(true)
  })

  it("places a time in the bucket whose range contains it", () => {
    const buckets = bucketTimes([20, 43, 50, 75, 100, 150, 240, 600])
    const counts = Object.fromEntries(buckets.map((b) => [b.label, b.count]))
    expect(counts["<30s"]).toBe(1)
    expect(counts["30–45s"]).toBe(1)
    expect(counts["45–60s"]).toBe(1)
    expect(counts["1:00–1:30"]).toBe(1)
    expect(counts["1:30–2:00"]).toBe(1)
    expect(counts["2:00–3:00"]).toBe(1)
    expect(counts["3:00–5:00"]).toBe(1)
    expect(counts["5:00+"]).toBe(1)
  })

  it("treats each boundary as the start of the next bucket", () => {
    const buckets = bucketTimes([30, 45, 60, 90, 120, 180, 300])
    const counts = Object.fromEntries(buckets.map((b) => [b.label, b.count]))
    expect(counts["<30s"]).toBe(0)
    expect(counts["30–45s"]).toBe(1)
    expect(counts["45–60s"]).toBe(1)
    expect(counts["5:00+"]).toBe(1)
  })

  it("reports the largest bucket so a chart can scale to it", () => {
    const buckets = bucketTimes([70, 75, 80, 200])
    expect(Math.max(...buckets.map((b) => b.count))).toBe(3)
  })
})

describe("percentileRank", () => {
  it("is the share of entries strictly slower", () => {
    expect(percentileRank(43, [43, 47, 51])).toBe(67)
    expect(percentileRank(47, [43, 47, 51])).toBe(33)
    expect(percentileRank(51, [43, 47, 51])).toBe(0)
  })

  it("does not count ties as slower", () => {
    expect(percentileRank(47, [47, 47, 51])).toBe(33)
  })

  it("is 0 with nothing to compare against", () => {
    expect(percentileRank(43, [])).toBe(0)
  })
})

describe("gapToLeader", () => {
  it("is how many seconds to shave to match the record", () => {
    expect(gapToLeader(82, 43)).toBe(39)
  })

  it("is 0 when you already hold or match it", () => {
    expect(gapToLeader(43, 43)).toBe(0)
    expect(gapToLeader(40, 43)).toBe(0)
  })

  it("is null when there is no record yet", () => {
    expect(gapToLeader(82, null)).toBeNull()
  })
})

describe("dailySeries", () => {
  it("fills missing days with zero and keeps chronological order", () => {
    const series = dailySeries([{ day: "2026-08-26", count: 4 }], 3, "2026-08-26")
    expect(series).toEqual([
      { day: "2026-08-24", count: 0 },
      { day: "2026-08-25", count: 0 },
      { day: "2026-08-26", count: 4 },
    ])
  })

  it("ignores days outside the window", () => {
    const series = dailySeries(
      [
        { day: "2026-08-01", count: 9 },
        { day: "2026-08-25", count: 2 },
      ],
      2,
      "2026-08-26",
    )
    expect(series).toEqual([
      { day: "2026-08-25", count: 2 },
      { day: "2026-08-26", count: 0 },
    ])
  })

  it("crosses a month boundary correctly", () => {
    const series = dailySeries([], 2, "2026-09-01")
    expect(series.map((d) => d.day)).toEqual(["2026-08-31", "2026-09-01"])
  })
})

describe("axisPosition", () => {
  const buckets = bucketTimes([])
  const width = 1 / TIME_BUCKETS.length

  it("sits at the left edge of the bucket holding the value", () => {
    expect(axisPosition(30, buckets)).toBeCloseTo(width, 5)
    // 60s is excluded from the [45,60) bucket, so it opens the fourth one
    expect(axisPosition(60, buckets)).toBeCloseTo(width * 3, 5)
  })

  it("interpolates within a bucket", () => {
    // 37.5s is halfway through the 30-45s bucket, which is the second of eight
    expect(axisPosition(37.5, buckets)).toBeCloseTo(width * 1.5, 5)
  })

  it("centres a value in the open-ended final bucket", () => {
    expect(axisPosition(600, buckets)).toBeCloseTo(width * 7.5, 5)
  })

  it("clamps below the first bucket and never leaves the axis", () => {
    expect(axisPosition(0, buckets)).toBe(0)
    expect(axisPosition(-5, buckets)).toBe(0)
    expect(axisPosition(99999, buckets)).toBeLessThanOrEqual(1)
  })
})
