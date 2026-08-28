import { describe, expect, it } from "vitest"
import { claimOutcome } from "@/lib/claim-outcome"

describe("claimOutcome", () => {
  it("keeps the server's sentence, which names both accounts", () => {
    // The whole point of the message: who the entry belongs to, and who you
    // proved you were. A generic fallback throws that away.
    const outcome = claimOutcome("nixgoblin", {
      ok: false,
      error: "That entry belongs to @nixgoblin. You authorized as @xgborgeso.",
    })
    expect(outcome).toEqual({
      ok: false,
      message: "That entry belongs to @nixgoblin. You authorized as @xgborgeso.",
    })
  })

  it("says which entry was proven on success", () => {
    expect(claimOutcome("ada", { ok: true })).toEqual({
      ok: true,
      message: "@ada is verified",
    })
  })

  it("reads as one sentence, with no title to repeat it", () => {
    // A title saying "that claim did not go through" above a line saying why
    // is the same information twice, and the second line is the useful one.
    const outcome = claimOutcome("ada", { ok: false, error: "Nothing to claim." })
    expect(outcome.message).toBe("Nothing to claim.")
    expect(outcome.message).not.toMatch(/did not go through/i)
  })

  it("falls back only when there is genuinely nothing to report", () => {
    // A thrown request — rate limit, network — arrives as null.
    expect(claimOutcome("ada", null).ok).toBe(false)
    expect(claimOutcome("ada", null).message).toMatch(/could not/i)
  })
})
