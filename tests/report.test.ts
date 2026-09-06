import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Where an unexpected error goes.
 *
 * Console only, deliberately: the shape is what matters, so choosing between
 * a log drain, Sentry or anything else stays a change to this one function.
 * The two branches exist because the reader differs — a machine in
 * production, a person on a laptop — and the fields do not.
 */
const logged: string[] = []

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  logged.length = 0
  vi.spyOn(console, "error").mockImplementation((m: string) => {
    logged.push(m)
  })
})

async function capture(nodeEnv: string, err: unknown) {
  vi.stubEnv("NODE_ENV", nodeEnv)
  const { captureError } = await import("../src/server/report")
  await captureError(err)
  return logged.join("\n")
}

describe("captureError", () => {
  it("writes one parseable line in production", async () => {
    // Where something might be reading it, a stack split across lines is not
    // one event.
    const out = await capture("production", new Error("boom"))
    const parsed = JSON.parse(out)
    expect(parsed).toMatchObject({ level: "error", name: "Error", message: "boom" })
    expect(parsed.stack).toContain("boom")
  })

  it("writes a readable stack where a person is watching", async () => {
    const out = await capture("development", new Error("boom"))
    expect(out).toContain("[Error] boom")
    expect(() => JSON.parse(out)).toThrow()
  })

  it("carries the same fields either way", async () => {
    const prod = JSON.parse(await capture("production", new Error("boom")))
    logged.length = 0
    const dev = await capture("development", new Error("boom"))
    expect(dev).toContain(prod.name)
    expect(dev).toContain(prod.message)
  })

  it("takes something that was never an Error", async () => {
    // Anything can be thrown, and a reporter that throws on the throw is the
    // last thing a failing request needs.
    const out = await capture("production", "just a string")
    expect(JSON.parse(out)).toMatchObject({ message: "just a string" })
  })

  it("survives an error with no stack", async () => {
    const bare = new Error("boom")
    bare.stack = undefined
    const out = await capture("development", bare)
    expect(out).toContain("boom")
  })
})
