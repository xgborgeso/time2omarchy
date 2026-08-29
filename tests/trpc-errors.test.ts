import { TRPCError } from "@trpc/server"
import { describe, expect, it } from "vitest"
import { formatError } from "@/server/trpc/init"

/** The shape tRPC hands the formatter, trimmed to what we read. */
function shapeFor(message: string, code: string) {
  return {
    message,
    code: -32603,
    data: { code, httpStatus: 500, path: "board", stack: "Error: at loadBoard (…)" },
  }
}

describe("what a failed procedure tells the browser", () => {
  it("never sends the query back with the error", () => {
    // Drizzle puts the whole statement in the message, and the app has five
    // procedures with no try/catch — so a database blip would publish the
    // schema, the columns, and the shape of every filter to anyone watching
    // the network tab.
    const leak =
      'Failed query: select "id", "handle", "identity_key" from "entries" where "handle" = $1'
    const shape = shapeFor(leak, "INTERNAL_SERVER_ERROR")

    const out = formatError({
      shape,
      error: new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: leak }),
    })

    const seen = JSON.stringify(out)
    expect(seen).not.toMatch(/select /i)
    expect(seen).not.toMatch(/identity_key/)
    expect(seen).not.toMatch(/entries/)
  })

  it("never sends a stack trace, in any environment", () => {
    const out = formatError({
      shape: shapeFor("boom", "INTERNAL_SERVER_ERROR"),
      error: new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "boom" }),
    })

    expect(JSON.stringify(out)).not.toMatch(/at loadBoard/)
    expect((out.data as { stack?: string }).stack).toBeUndefined()
  })

  it("still says something, rather than failing silently", () => {
    const out = formatError({
      shape: shapeFor("anything", "INTERNAL_SERVER_ERROR"),
      error: new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "anything" }),
    })

    expect(out.message).toBeTruthy()
    expect(out.message).not.toBe("anything")
  })

  it("keeps the messages we wrote on purpose", () => {
    // A rate limit and a rejected input are deliberate answers, not leaks —
    // replacing them would turn "Slow down" into "Something went wrong".
    for (const code of ["TOO_MANY_REQUESTS", "BAD_REQUEST"] as const) {
      const out = formatError({
        shape: shapeFor("Slow down. Try again in an hour.", code),
        error: new TRPCError({ code, message: "Slow down. Try again in an hour." }),
      })
      expect(out.message).toBe("Slow down. Try again in an hour.")
    }
  })

  it("never sends a zod issue array, which is a schema in disguise", () => {
    // What the wire actually carried before this: the bounds of every field,
    // formatted for a developer. The forms validate before submitting, so a
    // server-side rejection means the form was bypassed — there is nobody
    // reading this who needs the constraint spelled out.
    const issues = JSON.stringify([
      { origin: "number", code: "too_big", maximum: 10000, path: ["page"] },
    ])

    const out = formatError({
      shape: shapeFor(issues, "BAD_REQUEST"),
      error: new TRPCError({ code: "BAD_REQUEST", message: issues }),
    })

    expect(out.message).not.toMatch(/too_big|maximum|origin/)
    expect(out.message).toBeTruthy()
  })
})
