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

const t = initTRPC.context<Context>().create()

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
