import { describe, expect, it } from "vitest"
import { authErrorFrom } from "@/lib/auth-error"

describe("authErrorFrom", () => {
  it("says nothing when the trip to X went fine", () => {
    expect(authErrorFrom("?rank=1")).toBeNull()
    expect(authErrorFrom("")).toBeNull()
  })

  it("prefers the provider's own words to its error code", () => {
    // The code is written for logs. The description is written for people.
    const error = authErrorFrom("?error=MISSING_FIELD&error_description=handle+is+required")
    expect(error?.message).toMatch(/handle is required/)
    expect(error?.message).not.toMatch(/MISSING_FIELD/)
  })

  it("still explains itself when there is no description", () => {
    expect(authErrorFrom("?error=server_error")?.message).toMatch(/could not finish/i)
  })

  it("does not call a cancellation an error", () => {
    // Backing out on X is a decision, not a fault, and saying "failed" to
    // someone who chose to stop reads as a bug.
    expect(authErrorFrom("?error=access_denied")?.message).toMatch(/cancelled/i)
  })

  it("never leaves someone guessing what happened", () => {
    // The case this exists for: credits exhausted, so the callback fails at
    // the last step. Whatever the code says, something has to be said.
    for (const q of ["?error=402", "?error=unknown_thing", "?error=x"]) {
      expect(authErrorFrom(q)?.message).toBeTruthy()
    }
  })
})
