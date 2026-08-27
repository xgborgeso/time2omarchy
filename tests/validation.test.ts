import { describe, expect, it } from "vitest"
import { isValidHandle, normalizeHandle } from "../src/lib/handle"
import { shouldReplace } from "../src/lib/ranking"
import { handleSchema, metadataSchema, timeSchema } from "../src/lib/validation"

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

  it("rejects out of range and unparseable", () => {
    expect(timeSchema.safeParse("5s").success).toBe(false)
    expect(timeSchema.safeParse("20:00").success).toBe(false)
    expect(timeSchema.safeParse("nope").success).toBe(false)
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
