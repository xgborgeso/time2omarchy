import { describe, expect, it } from "vitest"
import { readUploadStore } from "@/server/env"

const APP_ID = "wapdhwi3qt"
const BASE = `https://${APP_ID}.ufs.sh`

function tokenFor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64")
}

const VALID = tokenFor({ apiKey: "sk_live_pretend", appId: APP_ID, regions: ["sea1"] })

describe("readUploadStore", () => {
  it("accepts a matching pair", () => {
    expect(readUploadStore(VALID, BASE)).toEqual({
      token: VALID,
      appId: APP_ID,
      base: BASE,
    })
  })

  it("treats nothing configured as local disk, not an error", () => {
    // Development runs with none of this set, and the board still works.
    expect(readUploadStore(null, null)).toBeNull()
    expect(readUploadStore("", "  ")).toBeNull()
  })

  it("rejects a token pasted with its quotes", () => {
    // The regression. A quoted value is present, reads back correctly in a
    // dashboard, and fails only inside UploadThing — as a 500 with an empty
    // log. A shell strips these from a .env file; a hosting dashboard stores
    // them literally, so the two environments disagree about the same string.
    expect(() => readUploadStore(`'${VALID}'`, BASE)).toThrow(/quotes/)
    expect(() => readUploadStore(`"${VALID}"`, BASE)).toThrow(/quotes/)
  })

  it("rejects a token with a stray newline or space", () => {
    // The same class of paste damage as quotes, and just as invisible.
    expect(() => readUploadStore(`${VALID}\n`.trimEnd(), BASE)).not.toThrow()
    expect(() => readUploadStore(`${VALID} x`, BASE)).toThrow(/not base64/)
    expect(() => readUploadStore("not a token", BASE)).toThrow(/not base64/)
  })

  it("rejects a truncated token", () => {
    // Valid alphabet all the way through, so only the decode catches it.
    expect(() => readUploadStore(VALID.slice(0, 40), BASE)).toThrow(/truncated/)
  })

  it("rejects a credential of the wrong shape", () => {
    const wrong = tokenFor({ token: "something-else" })
    expect(() => readUploadStore(wrong, BASE)).toThrow(/apiKey, appId, regions/)
  })

  it("rejects a base belonging to another app", () => {
    // Both halves valid, and still broken: uploads would succeed and every
    // rank would then be refused, because the board only accepts urls from
    // the origin it was told about.
    expect(() => readUploadStore(VALID, "https://someoneelse.ufs.sh")).toThrow(
      /should be https:\/\/wapdhwi3qt\.ufs\.sh/,
    )
  })

  it("refuses half a configuration rather than degrading", () => {
    expect(() => readUploadStore(VALID, null)).toThrow(/PUBLIC_UPLOAD_BASE is not/)
    expect(() => readUploadStore(null, BASE)).toThrow(/UPLOADTHING_TOKEN is not/)
  })

  it("names the fix, not just the fault", () => {
    // These messages are read by whoever is mid-deploy and cannot see inside
    // the process. A message that only says "invalid" costs an afternoon.
    const said = (fn: () => unknown) => {
      try {
        fn()
      } catch (err) {
        return (err as Error).message
      }
      return ""
    }
    expect(said(() => readUploadStore(`'${VALID}'`, BASE))).toMatch(/remove them/)
    expect(said(() => readUploadStore(VALID, "https://other.ufs.sh"))).toMatch(
      /It should be/,
    )
  })
})
