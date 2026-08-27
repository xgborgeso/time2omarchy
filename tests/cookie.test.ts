import { describe, expect, it } from "vitest"
import { readCookie, serializeCookie } from "@/lib/cookie"

describe("readCookie", () => {
  it("finds a value among several", () => {
    expect(readCookie("a=1; t2o_vid=abc; b=2", "t2o_vid")).toBe("abc")
  })

  it("finds a value that stands alone", () => {
    expect(readCookie("t2o_vid=abc", "t2o_vid")).toBe("abc")
  })

  it("tolerates missing spaces after the separator", () => {
    expect(readCookie("a=1;t2o_vid=abc", "t2o_vid")).toBe("abc")
  })

  it("does not match a name that merely ends with the one asked for", () => {
    // "other_vid" must not satisfy a request for "vid".
    expect(readCookie("other_vid=nope", "vid")).toBeNull()
  })

  it("returns null for an absent cookie or header", () => {
    expect(readCookie("a=1", "t2o_vid")).toBeNull()
    expect(readCookie(null, "t2o_vid")).toBeNull()
    expect(readCookie("", "t2o_vid")).toBeNull()
  })

  it("decodes a percent-encoded value", () => {
    expect(readCookie("t2o_vid=a%20b", "t2o_vid")).toBe("a b")
  })
})

describe("serializeCookie", () => {
  it("sets the attributes a visitor id needs", () => {
    const header = serializeCookie("t2o_vid", "abc", { maxAge: 60, secure: true })
    expect(header).toContain("t2o_vid=abc")
    expect(header).toContain("Path=/")
    expect(header).toContain("Max-Age=60")
    expect(header).toContain("HttpOnly")
    expect(header).toContain("SameSite=Lax")
    expect(header).toContain("Secure")
  })

  it("omits Secure when the connection is not https", () => {
    expect(serializeCookie("t2o_vid", "abc", { maxAge: 60, secure: false })).not.toContain(
      "Secure",
    )
  })

  it("encodes a value that would otherwise break the header", () => {
    expect(serializeCookie("t2o_vid", "a b;c", { maxAge: 60, secure: false })).toContain(
      "t2o_vid=a%20b%3Bc",
    )
  })
})
