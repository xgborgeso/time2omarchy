import { describe, expect, it } from "vitest"
import { hashForView, viewFromHash } from "@/lib/view"

describe("viewFromHash", () => {
  it("reads each view from its hash", () => {
    expect(viewFromHash("#stats")).toBe("stats")
    expect(viewFromHash("#rules")).toBe("rules")
    expect(viewFromHash("#board")).toBe("board")
  })

  it("tolerates a missing leading #", () => {
    expect(viewFromHash("stats")).toBe("stats")
    expect(viewFromHash("rules")).toBe("rules")
  })

  it("falls back to the board for an empty or unknown hash", () => {
    expect(viewFromHash("")).toBe("board")
    expect(viewFromHash("#")).toBe("board")
    expect(viewFromHash("#nonsense")).toBe("board")
  })
})

describe("hashForView", () => {
  it("gives the board an empty hash, so it is the bare url", () => {
    expect(hashForView("board")).toBe("")
  })

  it("gives every other view a shareable hash", () => {
    expect(hashForView("stats")).toBe("#stats")
    expect(hashForView("rules")).toBe("#rules")
  })

  it("round-trips every view", () => {
    for (const view of ["board", "stats", "rules"] as const) {
      expect(viewFromHash(hashForView(view))).toBe(view)
    }
  })
})
