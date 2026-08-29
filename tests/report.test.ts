import { afterEach, describe, expect, it, vi } from "vitest"
import { captureError } from "@/server/report"

const written: string[] = []
vi.spyOn(console, "error").mockImplementation((...args) => {
  written.push(args.map(String).join(" "))
})

afterEach(() => {
  written.length = 0
})

describe("captureError", () => {
  it("never writes what the error happened to be carrying", async () => {
    // A DrizzleQueryError carries `query` and `params` — the values somebody
    // just submitted. Handing the object to the console publishes them.
    const err = Object.assign(new Error("Failed query"), {
      query: "insert into entries (handle) values ($1)",
      params: ["a-real-persons-handle"],
    })

    await captureError(err)

    const said = written.join("\n")
    expect(said).toContain("Failed query")
    expect(said).not.toContain("a-real-persons-handle")
    expect(said).not.toContain("insert into entries")
  })

  it("keeps the name and the stack, which are what a fix needs", async () => {
    await captureError(new TypeError("nope"))
    const said = written.join("\n")
    expect(said).toContain("TypeError")
    expect(said).toContain("nope")
  })

  it("survives being handed something that is not an error", async () => {
    await expect(captureError("just a string")).resolves.toBeUndefined()
    expect(written.join("\n")).toContain("just a string")
  })
})
