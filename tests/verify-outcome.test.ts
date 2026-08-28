import { describe, expect, it } from "vitest"
import { verifyOutcome } from "@/lib/verify-outcome"

describe("verifyOutcome", () => {
  it("keeps the server's sentence, which names both accounts", () => {
    // The whole point of the message: who the entry belongs to, and who you
    // proved you were. A generic fallback throws that away.
    const outcome = verifyOutcome({
      ok: false,
      error: "That entry belongs to @nixgoblin. You authorized as @xgborgeso.",
    })
    expect(outcome).toEqual({
      ok: false,
      message: "That entry belongs to @nixgoblin. You authorized as @xgborgeso.",
    })
  })

  it("says one word on success, because the mark says the rest", () => {
    // The check has just appeared on the entry. Anything longer is the toast
    // explaining something the board is already showing.
    expect(verifyOutcome({ ok: true })).toEqual({ ok: true, message: "Verified" })
  })

  it("reads as one sentence, with no title to repeat it", () => {
    // A title saying "that verify did not go through" above a line saying why
    // is the same information twice, and the second line is the useful one.
    const outcome = verifyOutcome({ ok: false, error: "Nothing to verify." })
    expect(outcome.message).toBe("Nothing to verify.")
    expect(outcome.message).not.toMatch(/did not go through/i)
  })

  it("falls back only when there is genuinely nothing to report", () => {
    // A thrown request — rate limit, network — arrives as null.
    expect(verifyOutcome(null).ok).toBe(false)
    expect(verifyOutcome(null).message).toMatch(/could not/i)
  })
})
