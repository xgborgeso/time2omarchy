import { describe, expect, it } from "vitest"
import { authErrorFrom } from "@/lib/auth-error"

describe("authErrorFrom", () => {
  it("says nothing when the trip to X went fine", () => {
    expect(authErrorFrom("?rank=1")).toBeNull()
    expect(authErrorFrom("")).toBeNull()
  })

  it("says the same sentence whatever went wrong", () => {
    // Every one of these is a real Better Auth or X code. Each phrasing would
    // be a guess about what somebody was doing, and they all mean the same
    // thing to them: it did not work, and nothing was ranked.
    const codes = [
      "unable_to_get_user_info",
      "state_mismatch",
      "access_denied",
      "signup_disabled",
      "MISSING_FIELD",
    ]
    const said = new Set(codes.map((c) => authErrorFrom(`?error=${c}`)?.message))
    expect(said.size).toBe(1)
    expect([...said][0]).toMatch(/could not finish signing in with x/i)
  })

  it("keeps the code for whoever has to fix it", () => {
    // The one the credits case produces: getUserInfo returns null when the
    // profile lookup is refused, and this is what Better Auth redirects with.
    expect(authErrorFrom("?error=unable_to_get_user_info")?.code).toBe(
      "unable_to_get_user_info",
    )
  })

  it("never puts a provider's wording in front of anyone", () => {
    // "handle is required" is written for a developer reading a stack trace.
    const error = authErrorFrom("?error=MISSING_FIELD&error_description=handle+is+required")
    expect(error?.message).not.toMatch(/handle is required/)
  })
})
