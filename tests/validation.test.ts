import { describe, expect, it } from "vitest"
import { isValidHandle, normalizeHandle } from "../src/lib/handle"
import { shouldReplace } from "../src/lib/ranking"
import { handleSchema, metadataSchema, timeError, timeSchema } from "../src/lib/validation"

describe("handles", () => {
  it("normalizes @ and case", () => {
    expect(normalizeHandle("@DHH")).toBe("dhh")
    expect(normalizeHandle("dhh")).toBe("dhh")
    expect(normalizeHandle("  @Omarchy_ ")).toBe("omarchy_")
  })

  it("validates X handle shape", () => {
    expect(isValidHandle("dhh")).toBe(true)
    expect(isValidHandle("a".repeat(15))).toBe(true)
    expect(isValidHandle("a".repeat(16))).toBe(false)
    expect(isValidHandle("d.hh")).toBe(false)
    expect(isValidHandle("")).toBe(false)
  })

  it("parses through zod", () => {
    expect(handleSchema.parse("@DHH")).toBe("dhh")
    expect(() => handleSchema.parse("not a handle!")).toThrow()
  })
})

describe("time schema", () => {
  it("normalizes to seconds", () => {
    expect(timeSchema.parse("1:12")).toBe(72)
    expect(timeSchema.parse("43s")).toBe(43)
  })

  it("rejects only what cannot have been an install", () => {
    expect(timeSchema.safeParse("2s").success).toBe(false)
    expect(timeSchema.safeParse("nope").success).toBe(false)
    // Slow is allowed. The board wants the tail as much as the head.
    expect(timeSchema.safeParse("20:00").success).toBe(true)
    expect(timeSchema.safeParse("1:30:00").success).toBe(true)
  })
})

describe("metadata", () => {
  it("accepts a valid pair", () => {
    expect(metadataSchema.parse({ handle: "@Ada", time: "1:05" })).toEqual({
      handle: "ada",
      time: 65,
    })
  })
})

describe("upsert rule", () => {
  it("inserts when empty and keeps the best time", () => {
    expect(shouldReplace(null, 43)).toBe(true)
    expect(shouldReplace(51, 43)).toBe(true)
    expect(shouldReplace(43, 43)).toBe(true)
    expect(shouldReplace(43, 50)).toBe(false)
  })
})

describe("timeError", () => {
  it("names the missing time rather than the schema that caught it", () => {
    // The form used to render the whole zod issue array at the user.
    expect(timeError("")).toBe("Add a time")
    expect(timeError("   ")).toBe("Add a time")
  })

  it("says what a time should look like when it cannot be parsed", () => {
    expect(timeError("soon")).toMatch(/43s or 1:12/)
  })

  it("gives the range when the time is outside it", () => {
    // The floor exists because the hero quotes the fastest time: a 1s entry
    // would hold the headline until somebody reported it.
    expect(timeError("2s")).toMatch(/faster than a boot/i)
    // ...but a slow install is a real install. Twenty minutes on a spinning
    // disk is the kind of entry the hardware benchmark exists to show.
    expect(timeError("20:00")).toBeNull()
    expect(timeError("1:30:00")).toBeNull()
    expect(timeError("48:00:00")).toMatch(/longer than a day/i)
  })

  it("returns nothing for a time that would be accepted", () => {
    expect(timeError("43s")).toBeNull()
    expect(timeError("1:12")).toBeNull()
  })
})
