import { describe, expect, it } from "vitest"
import { refuseHandleChange } from "../src/server/auth"

/**
 * The handle decides who owns an entry, so it may only ever come from X.
 *
 * Better Auth cannot express "set at sign-up, never afterwards": marking the
 * field `input: false` makes it unsettable from the provider profile too, so
 * the profile value never arrives and creation fails. The field is therefore
 * ordinary input, and this is the guard that stops it being changed later.
 */
describe("refuseHandleChange", () => {
  it("drops a handle someone tries to set on themselves", async () => {
    // Without this, signing in and PATCHing handle to a stranger's would be
    // enough to verify their entry.
    const result = await refuseHandleChange({ name: "Ada", handle: "nixgoblin" })
    expect(result).toEqual({ data: { name: "Ada" } })
  })

  it("leaves an update that does not touch the handle alone", async () => {
    const result = await refuseHandleChange({ name: "Ada", image: "https://x/a.png" })
    expect(result).toEqual({ data: { name: "Ada", image: "https://x/a.png" } })
  })

  it("drops it however it is spelled or typed", async () => {
    expect(await refuseHandleChange({ handle: "" })).toEqual({ data: {} })
    expect(await refuseHandleChange({ handle: null })).toEqual({ data: {} })
  })
})
