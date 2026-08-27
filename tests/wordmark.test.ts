import { describe, expect, it } from "vitest"
import { wordmarkBaselineOffset, wordmarkHeight } from "@/lib/wordmark"

describe("wordmarkHeight", () => {
  it("is the viewBox height at intrinsic width", () => {
    expect(wordmarkHeight(1215)).toBe(285)
  })

  it("preserves the aspect ratio, rounded to whole pixels", () => {
    expect(wordmarkHeight(64)).toBe(15)
    expect(wordmarkHeight(128)).toBe(30)
  })
})

describe("wordmarkBaselineOffset", () => {
  it("is the descender depth at intrinsic height", () => {
    expect(wordmarkBaselineOffset(285)).toBe(30)
  })

  it("scales with the rendered height", () => {
    expect(wordmarkBaselineOffset(15)).toBeCloseTo(1.579, 3)
    expect(wordmarkBaselineOffset(30)).toBeCloseTo(3.158, 3)
  })

  it("is zero for a zero-height wordmark", () => {
    expect(wordmarkBaselineOffset(0)).toBe(0)
  })
})
