import { z } from "zod"
import { searchCpus } from "../../lib/cpus"
import { specsSchema } from "../../lib/specs"
import { handleSchema, timeSchema } from "../../lib/validation"
import { loadBoard, loadStats } from "../board"
import { identityFrom } from "../identity"
import { claimEntry, submitRank } from "../rank"
import { Limiter } from "../ratelimit"
import { captureError } from "../sentry"
import { touchPresence } from "../stats"
import { visitorIdFrom } from "../visitor"
import { publicProcedure, router, throttled } from "./init"

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

/** Reads are generous; writes are cheap to send and expensive to serve. */
const readLimit = new Limiter({ windowMs: MINUTE, max: 300 })
const rankLimit = new Limiter({ windowMs: HOUR, max: 8 })

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const, name: "time2omarchy" })),

  // Pure reads. They used to record presence too, but a query that writes
  // cannot be prerendered: a static render happens once per revalidation with
  // no visitor headers, so it would count one visit per rebuild rather than
  // one per person, and could not set the visitor cookie at all.
  board: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .query(() => loadBoard()),

  stats: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .query(() => loadStats()),

  /**
   * The CPU catalogue, searched on the server.
   *
   * Kept off the client bundle deliberately: 227 chips are only needed by
   * someone who opens the specs picker, which most visitors never do.
   */
  cpus: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .input(z.object({ query: z.string().max(64) }))
    .query(({ input }) => searchCpus(input.query)),

  /** Records that someone is here. The write half of what board used to do. */
  visit: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .input(z.object({ countView: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const visitorId = visitorIdFrom(ctx.headers, ctx.resHeaders, ctx.secure)
      await touchPresence(visitorId, input.countView)
      return { ok: true as const }
    }),

  /**
   * Takes over a row that was ranked as a guest. No input: the only thing it
   * could take is a handle, and a handle someone types is exactly what this
   * exists to stop being trusted.
   */
  claim: publicProcedure
    .use(throttled(rankLimit, "Slow down. Try again in an hour."))
    .mutation(async ({ ctx }) => {
      try {
        const identity = await identityFrom(ctx.headers)
        if (!identity) {
          return {
            ok: false as const,
            error: "Sign in with X first.",
            field: "handle" as const,
          }
        }
        return await claimEntry(identity)
      } catch (err) {
        await captureError(err)
        return {
          ok: false as const,
          error: "Could not claim that entry",
          field: "form" as const,
        }
      }
    }),

  rank: publicProcedure
    .use(throttled(rankLimit, "Slow down. Try again in an hour."))
    .input(
      z
        .object({
          handle: handleSchema,
          // Parsed here so "1:12" and "43s" keep working; the client sends text.
          time: timeSchema,
          bootScreenUrl: z.string().min(1),
        })
        .extend(specsSchema.shape),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitRank({
          // Verification is the session and nothing else: whoever is signed in
          // owns the entry, and the typed handle is only used without one.
          identity: await identityFrom(ctx.headers),
          handle: input.handle,
          timeSeconds: input.time,
          bootScreenUrl: input.bootScreenUrl,
          cpuId: input.cpuId,
          ramGb: input.ramGb,
          storage: input.storage,
        })
      } catch (err) {
        await captureError(err)
        return { ok: false as const, error: "Ranking failed", field: "form" as const }
      }
    }),
})

export type AppRouter = typeof appRouter
