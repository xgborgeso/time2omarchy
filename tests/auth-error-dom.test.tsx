import { afterEach, describe, expect, it, vi } from "vitest"
import { consumeAuthError } from "@/lib/auth-error"

function at(search: string) {
  window.history.replaceState(null, "", `/${search}`)
}

const written: unknown[][] = []
for (const level of ["error", "warn", "log", "info", "debug"] as const) {
  vi.spyOn(console, level).mockImplementation((...args) => {
    written.push(args)
  })
}

afterEach(() => {
  written.length = 0
})

describe("consumeAuthError", () => {
  it("writes nothing to the browser console, whatever went wrong", () => {
    // A visitor with devtools open must not be shown an internal code. The
    // server already logged the real cause, which is more specific anyway.
    at("?error=unable_to_get_user_info&error_description=handle+is+required")

    consumeAuthError()

    expect(written).toEqual([])
  })

  it("clears the reason from the url, so a reload does not repeat it", () => {
    at("?error=state_mismatch&error_description=stale")

    expect(consumeAuthError()).toMatch(/could not finish/i)
    expect(window.location.search).toBe("")
  })

  it("leaves the rest of the query string alone", () => {
    // `?rank=1` is how the form reopens after X. Clearing it would strand
    // somebody who did get back successfully.
    at("?rank=1&error=access_denied")

    consumeAuthError()

    expect(window.location.search).toBe("?rank=1")
  })

  it("does nothing at all when the trip went fine", () => {
    at("?rank=1")

    expect(consumeAuthError()).toBeNull()
    expect(window.location.search).toBe("?rank=1")
    expect(written).toEqual([])
  })

  it("never puts the code or the provider's words in what it returns", () => {
    at("?error=unable_to_get_user_info&error_description=handle+is+required")

    const message = consumeAuthError() ?? ""

    expect(message).not.toMatch(/unable_to_get_user_info/)
    expect(message).not.toMatch(/handle is required/)
  })
})
