import { describe, expect, it } from "vitest"
import { errorText } from "@/lib/error-text"

describe("errorText", () => {
  it("pulls the message out of a serialized zod issue list", () => {
    // tRPC puts the whole issue array in `message`, and the form used to
    // render it verbatim: [ { "origin": "string", "code": "too_small", … } ]
    const err = new Error(
      JSON.stringify([
        { origin: "string", code: "too_small", path: ["time"], message: "Add a time" },
      ]),
    )
    expect(errorText(err, "Ranking failed")).toBe("Add a time")
  })

  it("keeps a plain message as written", () => {
    expect(errorText(new Error("Failed to fetch"), "Ranking failed")).toBe(
      "Failed to fetch",
    )
  })

  it("falls back rather than showing json it cannot read", () => {
    expect(errorText(new Error('{"weird":true}'), "Ranking failed")).toBe("Ranking failed")
    expect(errorText("not an error", "Ranking failed")).toBe("Ranking failed")
  })
})
