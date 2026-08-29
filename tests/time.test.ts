import { describe, expect, it } from "vitest"
import {
  formatTime,
  isTimeInRange,
  MAX_SECONDS,
  MIN_SECONDS,
  parseTime,
  relativeTime,
} from "../src/lib/time"

describe("parseTime", () => {
  it("parses plain seconds", () => {
    expect(parseTime("43")).toBe(43)
    expect(parseTime("72")).toBe(72)
    expect(parseTime("  90 ")).toBe(90)
  })

  it("parses seconds with a suffix", () => {
    expect(parseTime("43s")).toBe(43)
    expect(parseTime("43S")).toBe(43)
  })

  it("parses mm:ss", () => {
    expect(parseTime("1:12")).toBe(72)
    expect(parseTime("01:12")).toBe(72)
    expect(parseTime("0:43")).toBe(43)
    expect(parseTime("15:00")).toBe(900)
  })

  it("parses hh:mm:ss", () => {
    expect(parseTime("1:01:02")).toBe(3662)
  })

  it("parses named units", () => {
    expect(parseTime("1m12s")).toBe(72)
    expect(parseTime("1m 12s")).toBe(72)
    expect(parseTime("2m")).toBe(120)
    expect(parseTime("1.5m")).toBe(90)
    expect(parseTime("90s")).toBe(90)
  })

  it("rejects garbage", () => {
    expect(parseTime("")).toBeNull()
    expect(parseTime("fast")).toBeNull()
    expect(parseTime("1:99")).toBeNull()
    expect(parseTime("::")).toBeNull()
  })
})

describe("formatTime", () => {
  it("uses seconds under a minute", () => {
    expect(formatTime(43)).toBe("43s")
    expect(formatTime(0)).toBe("0s")
  })

  it("uses m:ss at a minute and above", () => {
    expect(formatTime(60)).toBe("1:00")
    expect(formatTime(72)).toBe("1:12")
    expect(formatTime(900)).toBe("15:00")
  })
})

describe("range", () => {
  it("accepts anything that could have been an install", () => {
    expect(isTimeInRange(MIN_SECONDS)).toBe(true)
    expect(isTimeInRange(MAX_SECONDS)).toBe(true)
    // A slow install is still an install: twenty minutes on a spinning disk
    // is exactly the entry the hardware benchmark exists to show.
    expect(isTimeInRange(20 * 60)).toBe(true)
    expect(isTimeInRange(90 * 60)).toBe(true)
  })

  it("refuses only what cannot have been one", () => {
    expect(isTimeInRange(4)).toBe(false)
    expect(isTimeInRange(MAX_SECONDS + 1)).toBe(false)
    expect(isTimeInRange(43.5)).toBe(false)
  })
})

describe("relativeTime", () => {
  const now = Date.parse("2026-08-26T12:00:00Z")

  it("formats buckets", () => {
    expect(relativeTime(new Date(now - 3_000), now)).toBe("just now")
    expect(relativeTime(new Date(now - 20_000), now)).toBe("20s ago")
    expect(relativeTime(new Date(now - 5 * 60_000), now)).toBe("5m ago")
    expect(relativeTime(new Date(now - 3 * 3600_000), now)).toBe("3h ago")
    expect(relativeTime(new Date(now - 24 * 3600_000), now)).toBe("yesterday")
    expect(relativeTime(new Date(now - 3 * 24 * 3600_000), now)).toBe("3d ago")
  })
})
