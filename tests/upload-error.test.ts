import { UploadThingError } from "uploadthing/server"
import { describe, expect, it } from "vitest"
import { uploadErrorFrom } from "@/lib/upload-error"

const GENERIC = "Could not upload that boot screen. Try again in a moment."

describe("uploadErrorFrom", () => {
  it("names the refusal a person can act on", () => {
    // The one the file router raises itself, when there is no session behind
    // the request. Telling someone to connect X is the whole point of it.
    const refusal = new UploadThingError({
      code: "FORBIDDEN",
      message: "Connect X before uploading.",
    })
    expect(uploadErrorFrom(refusal)).toBe("Connect X before uploading.")
  })

  it("distinguishes the causes it can", () => {
    // Regression: all of these used to arrive as one sentence, which named
    // none of them and left nothing to act on or diagnose.
    const said = (code: string) =>
      uploadErrorFrom(new UploadThingError({ code: code as "TOO_LARGE" }))
    const messages = ["FORBIDDEN", "TOO_LARGE", "TOO_MANY_FILES"].map(said)
    expect(new Set(messages).size).toBe(3)
  })

  it("falls back rather than repeating what a third party wrote", () => {
    // UploadThing's own wording for these is aimed at whoever wired the route
    // up, and some of it names internals. None of it should reach a visitor.
    const internal = new UploadThingError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed query: select * from uploads",
    })
    expect(uploadErrorFrom(internal)).toBe(GENERIC)
    expect(uploadErrorFrom(internal)).not.toMatch(/select/)
  })

  it("survives whatever it is handed", () => {
    // It reads an error off a callback, so nothing guarantees its shape.
    expect(uploadErrorFrom(null)).toBe(GENERIC)
    expect(uploadErrorFrom(undefined)).toBe(GENERIC)
    expect(uploadErrorFrom(new Error("boom"))).toBe(GENERIC)
    expect(uploadErrorFrom({ code: "NOT_A_CODE" })).toBe(GENERIC)
    expect(uploadErrorFrom("string")).toBe(GENERIC)
  })
})
