import { describe, expect, it } from "vitest"
import { matchesSpec } from "@/lib/benchmark"
import { errorText } from "@/lib/error-text"
import { keyMatchesUrl } from "@/lib/storage-key"
import { formatTime, parseTime, relativeTime } from "@/lib/time"
import { timeSchema } from "@/lib/validation"

/**
 * The branches nothing else reaches.
 *
 * Each one is a path a person can actually take — a URL that will not parse, a
 * board old enough to be measured in years, a time typed with a decimal point.
 * They are gathered here rather than scattered because none of them belongs to
 * the story its own suite is telling.
 */
/** What tRPC actually throws: an Error whose message is a serialised issue. */
const thrown = (message: string) => new Error(message)

describe("errorText", () => {
  it("reads the first issue out of a serialised zod array", () => {
    // Rendering the array verbatim showed people the whole schema where a
    // sentence belonged. Only the first issue matters: it is the field they
    // have to fix first.
    expect(
      errorText(thrown(JSON.stringify([{ message: "Pick an offered size" }])), "fallback"),
    ).toBe("Pick an offered size")
  })

  it("reads one issue that was not wrapped in an array", () => {
    expect(errorText(thrown(JSON.stringify({ message: "Whole seconds only." })), "x")).toBe(
      "Whole seconds only.",
    )
  })

  it("passes through anything that was written to be read", () => {
    expect(errorText(thrown("Slow down. Try again in an hour."), "x")).toBe(
      "Slow down. Try again in an hour.",
    )
  })

  it("falls back when the parsed shape holds no message", () => {
    expect(errorText(thrown(JSON.stringify([{}])), "fallback")).toBe("fallback")
    expect(errorText(thrown(JSON.stringify([null])), "fallback")).toBe("fallback")
    expect(errorText(thrown(JSON.stringify(["a string"])), "fallback")).toBe("fallback")
    expect(errorText(thrown(JSON.stringify([{ message: "" }])), "fallback")).toBe(
      "fallback",
    )
  })

  it("falls back rather than throwing on json that will not parse", () => {
    // A crash here would replace a form message with a blank screen.
    expect(errorText(thrown("[[[not json"), "fallback")).toBe("fallback")
  })

  it("falls back on anything that is not an Error at all", () => {
    expect(errorText(undefined, "fallback")).toBe("fallback")
    expect(errorText(thrown(""), "fallback")).toBe("fallback")
  })
})

describe("keyMatchesUrl", () => {
  const base = "https://abc.ufs.sh"

  it("accepts a key that is the last segment of its own url", () => {
    expect(keyMatchesUrl("k1", `${base}/f/k1`, base)).toBe(true)
  })

  it("refuses a url on another origin", () => {
    // Otherwise the board points every visitor at any remote image somebody
    // cared to name.
    expect(keyMatchesUrl("k1", "https://elsewhere.example/f/k1", base)).toBe(false)
  })

  it("refuses a key that is not the one inside the url", () => {
    // A mismatch could later delete a file belonging to somebody else.
    expect(keyMatchesUrl("k1", `${base}/f/k2`, base)).toBe(false)
  })

  it("refuses anything that will not parse as a url at all", () => {
    expect(keyMatchesUrl("k1", "not a url", base)).toBe(false)
    expect(keyMatchesUrl("k1", `${base}/f/k1`, "not a base")).toBe(false)
  })
})

describe("relativeTime", () => {
  const now = new Date("2026-09-06T12:00:00.000Z")
  const ago = (ms: number) =>
    relativeTime(new Date(now.getTime() - ms).toISOString(), now.getTime())

  const DAY = 24 * 60 * 60 * 1000

  it("counts in days until a month has passed", () => {
    expect(ago(DAY)).toBe("yesterday")
    expect(ago(5 * DAY)).toBe("5d ago")
    expect(ago(29 * DAY)).toBe("29d ago")
  })

  it("counts in months until a year has", () => {
    expect(ago(60 * DAY)).toBe("2mo ago")
    expect(ago(300 * DAY)).toBe("10mo ago")
  })

  it("counts in years after that", () => {
    // The board outlives its first year, and "400d ago" describes nothing.
    expect(ago(400 * DAY)).toBe("1y ago")
    expect(ago(800 * DAY)).toBe("2y ago")
  })
})

describe("timeSchema", () => {
  it("rounds a fraction rather than refusing it", () => {
    // `parseTime` rounds every fractional path, which is why the schema's
    // own integer guard can never fire — it is defence against a future
    // parseTime, not against anything a person can type today.
    expect(timeSchema.parse("43.4s")).toBe(43)
    expect(timeSchema.parse("43.6s")).toBe(44)
  })

  it("names the two ends differently, because they mean different things", () => {
    // One is "that cannot have been an install"; the other is "you mistyped".
    const fast = timeSchema.safeParse("2s")
    const slow = timeSchema.safeParse("30:00:00")
    expect(JSON.stringify(fast.error?.issues)).toMatch(/faster than a boot/i)
    expect(JSON.stringify(slow.error?.issues)).toMatch(/longer than a day/i)
  })

  it("says so when it cannot read the time at all", () => {
    expect(JSON.stringify(timeSchema.safeParse("half an hour").error?.issues)).toMatch(
      /could not parse/i,
    )
  })
})

describe("matchesSpec", () => {
  const row = { timeSeconds: 43, cpuId: "amd-ryzen-7-9800x3d", ramGb: 32, storage: "nvme" }

  it("matches every dimension the chart can be narrowed by", () => {
    expect(matchesSpec(row, { dimension: "storage", id: "nvme" })).toBe(true)
    expect(matchesSpec(row, { dimension: "ram", id: "32" })).toBe(true)
    expect(matchesSpec(row, { dimension: "vendor", id: "AMD" })).toBe(true)
    expect(matchesSpec(row, { dimension: "family", id: "Ryzen 9000" })).toBe(true)
    expect(matchesSpec(row, { dimension: "model", id: "amd-ryzen-7-9800x3d" })).toBe(true)
  })

  it("leaves an unlisted chip out of every CPU dimension", () => {
    // It is a failure of the catalogue, not a vendor, a family or a model.
    const other = { ...row, cpuId: "other" }
    expect(matchesSpec(other, { dimension: "vendor", id: "AMD" })).toBe(false)
    expect(matchesSpec(other, { dimension: "family", id: "Ryzen 9000" })).toBe(false)
    expect(matchesSpec(other, { dimension: "model", id: "other" })).toBe(true)
  })
})

describe("parseTime on each named unit", () => {
  it("takes any one of hours, minutes or seconds alone", () => {
    // Each is optional in the pattern, so each has to default when absent.
    expect(parseTime("2h")).toBe(7200)
    expect(parseTime("5m")).toBe(300)
    expect(parseTime("43s")).toBe(43)
  })

  it("takes them combined, in any of the shapes people write", () => {
    expect(parseTime("1h30m")).toBe(5400)
    expect(parseTime("2m30s")).toBe(150)
    expect(parseTime("1h 2m 3s")).toBe(3723)
  })

  it("reads a decimal, and rounds it to the second the board ranks in", () => {
    expect(parseTime("1.5m")).toBe(90)
    expect(parseTime("43,6s")).toBe(44)
  })

  it("takes a clock, with or without hours", () => {
    expect(parseTime("1:12")).toBe(72)
    expect(parseTime("1:02:03")).toBe(3723)
  })

  it("takes a bare number as seconds", () => {
    expect(parseTime("43")).toBe(43)
    expect(parseTime("43.6")).toBe(44)
  })

  it("refuses what is not a time", () => {
    expect(parseTime("")).toBeNull()
    expect(parseTime("   ")).toBeNull()
    expect(parseTime("half an hour")).toBeNull()
    expect(parseTime("1h2x")).toBeNull()
  })
})

describe("formatTime", () => {
  it("says seconds under a minute and a clock over one", () => {
    expect(formatTime(43)).toBe("43s")
    expect(formatTime(72)).toBe("1:12")
  })

  it("has something to show for a number that is not one", () => {
    // The board renders whatever the row holds, and a NaN would print "NaNs".
    expect(formatTime(Number.NaN)).toBe("—")
    expect(formatTime(-1)).toBe("—")
  })
})

describe("relativeTime on the short end", () => {
  it("counts seconds, then minutes, then hours", () => {
    const now = Date.parse("2026-09-06T12:00:00.000Z")
    const ago = (ms: number) => relativeTime(new Date(now - ms).toISOString(), now)

    expect(ago(3_000)).toBe("just now")
    expect(ago(20_000)).toBe("20s ago")
    expect(ago(5 * 60_000)).toBe("5m ago")
    expect(ago(5 * 3_600_000)).toBe("5h ago")
  })

  it("takes a Date as readily as a string", () => {
    const now = Date.parse("2026-09-06T12:00:00.000Z")
    expect(relativeTime(new Date(now - 20_000), now)).toBe("20s ago")
  })

  it("says nothing about a date it cannot read", () => {
    expect(relativeTime("not a date")).toBe("")
  })

  it("never counts backwards from a clock that is behind", () => {
    // Server and browser clocks disagree, and "-3s ago" is worse than "just
    // now" for something that has only just happened either way.
    const now = Date.parse("2026-09-06T12:00:00.000Z")
    expect(relativeTime(new Date(now + 60_000).toISOString(), now)).toBe("just now")
  })
})
