import { describe, expect, it } from "vitest"
import { authErrorFrom } from "@/lib/auth-error"

/** Every code Better Auth or X can hand back on a failed sign-in. */
const CODES = [
  "unable_to_get_user_info",
  "unable_to_link_account",
  "oauth_provider_not_found",
  "signup_disabled",
  "email_not_verified",
  "state_mismatch",
  "state_invalid",
  "state_not_found",
  "state_security_mismatch",
  "state_generation_error",
  "access_denied",
  "MISSING_FIELD",
  "internal_server_error",
]

describe("authErrorFrom", () => {
  it("says nothing when the trip to X went fine", () => {
    expect(authErrorFrom("?rank=1")).toBeNull()
    expect(authErrorFrom("")).toBeNull()
    expect(authErrorFrom("?error_description=orphaned")).toBeNull()
  })

  it("says the same sentence whatever went wrong", () => {
    // Each phrasing would be a guess about what somebody was doing, and they
    // all mean the same thing to them: it did not work, nothing was ranked.
    const said = new Set(CODES.map((c) => authErrorFrom(`?error=${c}`)?.message))
    expect(said.size).toBe(1)
    expect([...said][0]).toBe("Could not finish signing in with X. Try again in a moment.")
  })

  it("never hands back anything but that sentence", () => {
    // The whole returned object is read by the client. Anything else on it
    // ends up somewhere a visitor can read — a toast, a console, the DOM.
    for (const code of CODES) {
      const error = authErrorFrom(`?error=${code}`)
      expect(error).not.toBeNull()
      expect(Object.keys(error as object)).toEqual(["message"])
    }
  })

  it("leaks neither the code nor the provider's wording", () => {
    // `unable_to_get_user_info` is what an exhausted X account produces, and
    // "handle is required" is Better Auth talking to a developer. Neither
    // belongs in front of a person, and neither says anything a fix needs —
    // the server already logged the real cause.
    const error = authErrorFrom(
      "?error=unable_to_get_user_info&error_description=handle+is+required",
    )
    const serialised = JSON.stringify(error)
    expect(serialised).not.toMatch(/unable_to_get_user_info/)
    expect(serialised).not.toMatch(/handle is required/)
  })

  it("does not choke on a hostile query string", () => {
    // It reads whatever is in the address bar, so it is reachable by anyone.
    expect(authErrorFrom("?error=%E2%9C%93&error_description=%00")).not.toBeNull()
    expect(authErrorFrom("?error=" + "x".repeat(5000))?.message).toBeTruthy()
    expect(authErrorFrom("?error=<script>alert(1)</script>")?.message).not.toMatch(/script/)
  })
})
