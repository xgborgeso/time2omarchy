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
      position: null,
    })
  })

  it("falls back to the bare word when the server named no entry", () => {
    // No live path returns this, and with no entry there is nothing to share,
    // so the invitation would point at a button that is not there.
    expect(verifyOutcome({ ok: true })).toEqual({
      ok: true,
      message: "Verified.",
      position: null,
    })
  })

  it("carries the tweet, because verifying is the only moment that can", () => {
    // The redirect back from X has already discarded the form, so if the
    // share is not attached to this result it has nowhere left to live.
    const outcome = verifyOutcome({
      ok: true,
      entry: { handle: "xgborgeso", rank: 3, timeSeconds: 41 },
      total: 1200,
    })
    expect(outcome.position).toEqual({ rank: 3, timeSeconds: 41, total: 1200 })
    // A whole sentence in the same voice as every refusal beside it, naming
    // the account that was proved and then pointing at the button.
    expect(outcome.message).toBe("@xgborgeso is verified. Go tell them.")
  })

  it("offers no share to an entry that was refused", () => {
    // A refused verify leaves the row unproven, and an unproven row is
    // exactly the one that must not post "#1" from someone else's account.
    const outcome = verifyOutcome({ ok: false, error: "That entry doesn't belong to you." })
    expect(outcome.position).toBeNull()
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
