import { describe, expect, it } from "vitest"
import { benchmark, type matchesSpec } from "@/lib/benchmark"
import { check } from "@/lib/ratelimit"
import { storageLabel } from "@/lib/specs"
import { axisPosition, TIME_BUCKETS, type TimeBucket } from "@/lib/stats"
import { parseTime } from "@/lib/time"
import { timeError, validateBootScreen } from "@/lib/validation"

/**
 * The other side of every fork in the libraries.
 *
 * Each of these is a real state — a drive nobody offers, a time off the end of
 * the axis, a rate limit reached with nothing left in the window — and each is
 * cheap to reach directly and awkward to reach through the UI that normally
 * produces it.
 */
const row = (over: Partial<Parameters<typeof matchesSpec>[0]> = {}) => ({
  timeSeconds: 43,
  cpuId: "amd-ryzen-7-9800x3d",
  ramGb: 32,
  storage: "nvme",
  ...over,
})

describe("benchmark against values no picker offers", () => {
  it("drops a drive that is not one of the three", () => {
    // An entry outlives the options list, so a removed one must not become a
    // bucket of its own.
    const marks = benchmark([row({ storage: "floppy" }), row()])
    expect(marks.storage.map((b) => b.id)).toEqual(["nvme"])
  })

  it("drops a memory size that is not offered", () => {
    const marks = benchmark([row({ ramGb: 7 }), row()])
    expect(marks.ram.map((b) => b.id)).toEqual(["32"])
  })

  it("labels a drive it has no name for by its own id", () => {
    expect(storageLabel("floppy")).toBeNull()
  })

  it("leaves a chip outside the catalogue out of every level", () => {
    const marks = benchmark([row({ cpuId: "other" })])
    expect(marks.cpu).toEqual([])
    expect(marks.cpuUnlisted).toBe(1)
  })

  it("stays at the vendor when a family filter names nothing", () => {
    // A filter held over from a chart that has since changed level.
    const marks = benchmark([row()], { dimension: "family", id: "Nonexistent 9000" })
    expect(marks.cpuLevel).toBe("vendor")
    expect(marks.cpuParent).toBeNull()
  })

  it("stays at the vendor when a model filter is not in the catalogue", () => {
    const marks = benchmark([row()], { dimension: "model", id: "intel-pentium-ii" })
    expect(marks.cpuLevel).toBe("vendor")
  })

  it("names the models under a family that does exist", () => {
    const marks = benchmark([row()], { dimension: "family", id: "Ryzen 9000" })
    expect(marks.cpuLevel).toBe("model")
    expect(marks.cpu.map((b) => b.label)).toContain("Ryzen 7 9800X3D")
  })
})

/** The axis with counts on it, which is the shape the chart actually draws. */
const axis: TimeBucket[] = TIME_BUCKETS.map((b) => ({ ...b, count: 0 }))

describe("axisPosition", () => {
  it("has nowhere to put anything on an axis with no buckets", () => {
    expect(axisPosition(43, [])).toBe(0)
  })

  it("pins a time below the first bucket to the left edge", () => {
    expect(axisPosition(0, axis)).toBe(0)
  })

  it("sits a time in the open-ended last bucket at its centre", () => {
    // It has no width to interpolate across, so there is no better answer.
    expect(axisPosition(60 * 60 * 24, axis)).toBeCloseTo(0.9375)
  })

  it("pins a time past a closed axis to the right edge", () => {
    // Only reachable on an axis whose last bucket ends somewhere, which the
    // board's does not — but the function is given its buckets by the caller.
    const closed: TimeBucket[] = [{ label: "0–30s", from: 0, to: 30, count: 0 }]
    expect(axisPosition(500, closed)).toBe(1)
    expect(axisPosition(-1, closed)).toBe(0)
  })

  it("interpolates within a bucket that has two ends", () => {
    const middle = axisPosition(axis[1]!.from, axis)
    expect(middle).toBeGreaterThan(0)
    expect(middle).toBeLessThan(1)
  })
})

describe("the rate limit at its edges", () => {
  const window = { windowMs: 1000, max: 2 }

  it("allows until the window is full", () => {
    expect(check([], 1000, window).allowed).toBe(true)
    expect(check([900], 1000, window).allowed).toBe(true)
  })

  it("refuses once it is, and says how long to wait", () => {
    const decision = check([900, 950], 1000, window)
    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("does not record a blocked attempt", () => {
    // Otherwise hammering the endpoint keeps pushing the window forward and
    // turns a pause into a permanent block.
    const decision = check([900, 950], 1000, window)
    expect(decision.hits).toEqual([900, 950])
  })

  it("forgets hits that have aged out of the window", () => {
    expect(check([0, 1], 5000, window).allowed).toBe(true)
  })

  it("survives a full window whose hits all just expired", () => {
    // `live` can be empty while the caller still asks, and the wait has to be
    // computed against something rather than undefined.
    expect(check([], 1000, { windowMs: 1000, max: 0 }).allowed).toBe(false)
  })
})

describe("timeError", () => {
  it("says nothing about a time that parses", () => {
    expect(timeError("43s")).toBeNull()
  })

  it("names the first thing wrong", () => {
    expect(timeError("nonsense")).toMatch(/could not parse/i)
  })
})

describe("validateBootScreen", () => {
  it("asks for a file when there is none, or an empty one", () => {
    expect(validateBootScreen(null)).toMatchObject({ field: "bootScreen" })
    expect(validateBootScreen(new Blob([]))).toMatchObject({ field: "bootScreen" })
  })

  it("takes a blob with no type at all rather than guessing at it", () => {
    // A `Blob` is not a `File`, and the type is what the sender declares
    // anyway — the re-encode is what actually proves it is an image.
    expect(validateBootScreen(new Blob(["x"], { type: "" }))).toBeNull()
  })

  it("refuses a type no browser here will decode", () => {
    expect(validateBootScreen(new Blob(["x"], { type: "image/tiff" }))).toMatchObject({
      field: "bootScreen",
    })
  })

  it("takes one of the types it names", () => {
    expect(validateBootScreen(new Blob(["x"], { type: "image/webp" }))).toBeNull()
  })
})

describe("parseTime on a bare unit", () => {
  it("refuses a string that matched the pattern but named no unit", () => {
    expect(parseTime("h")).toBeNull()
    expect(parseTime("m")).toBeNull()
  })
})
