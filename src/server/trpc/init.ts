import { initTRPC, TRPCError } from "@trpc/server"
import type { Limiter } from "../ratelimit"

export type Context = {
  headers: Headers
  /** Who to throttle. Resolved at the edge of the request, not guessed here. */
  clientKey: string
  /** Where a Set-Cookie for the visitor id goes. */
  resHeaders: Headers
  secure: boolean
}

/**
 * What a failed procedure is allowed to tell the browser.
 *
 * Only the messages this app wrote on purpose. Five procedures have no
 * try/catch — the board, the search, the stats — so a database blip reaches
 * here unhandled, and Drizzle puts the entire statement in its message:
 * `Failed query: select "id", "handle", "identity_key" from "entries" …`.
 * Without this that is delivered to whoever is watching the network tab,
 * schema and all.
 *
 * A rate limit or a rejected input is a deliberate answer rather than a leak,
 * so those keep their wording. Anything unexpected is replaced, and the stack
 * goes in every environment — tRPC omits it in production by default, and
 * "by default" is not a thing to rely on for this.
 */
const SAFE_CODES = new Set([
  "BAD_REQUEST",
  "TOO_MANY_REQUESTS",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
])

type Shape = { message: string; code: number; data: Record<string, unknown> }

export function formatError({
  shape,
  error,
}: {
  shape: Shape
  error: { code?: string }
}): Shape {
  const { stack: _dropped, ...data } = shape.data
  const deliberate = error.code != null && SAFE_CODES.has(error.code)

  // Zod serialises its issues as a JSON array, and tRPC passes that straight
  // through as the message: every bound of every field, written for a
  // developer. The forms validate before submitting, so reaching this means
  // the form was bypassed and there is nobody who needs the schema explained.
  const isZodDump = shape.message.trimStart().startsWith("[")

  return {
    ...shape,
    message:
      deliberate && !isZodDump
        ? shape.message
        : "Something went wrong. Try again in a moment.",
    data,
  }
}

const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape, error }) =>
    formatError({ shape: shape as unknown as Shape, error }),
})

export const router = t.router
export const publicProcedure = t.procedure

/**
 * A per-process backstop, not the real defence. Serverless invocations do not
 * share memory, so a flood is properly stopped at the edge; this only catches
 * what reaches a single instance.
 */
export function throttled(limiter: Limiter, message: string) {
  return t.middleware(({ ctx, next }) => {
    if (!limiter.check(ctx.clientKey).allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message })
    }
    return next()
  })
}
