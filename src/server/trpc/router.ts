import { z } from "zod"
import { searchCpus } from "../../lib/cpus"
import { specsSchema } from "../../lib/specs"
import { handleSchema, timeSchema } from "../../lib/validation"
import { loadBoard, loadStats, searchEntries } from "../board"
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
/** Cheap and idempotent, and a refused claim is a normal thing to retry. */
const claimLimit = new Limiter({ windowMs: HOUR, max: 30 })

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const, name: "time2omarchy" })),

  // Pure reads. They used to record presence too, but a query that writes
  // cannot be prerendered: a static render happens once per revalidation with
  // no visitor headers, so it would count one visit per rebuild rather than
  // one per person, and could not set the visitor cookie at all.
  board: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .input(z.object({ page: z.number().int().min(1).max(10_000).default(1) }).optional())
    .query(({ input }) => loadBoard(input?.page ?? 1)),

  /**
   * The benchmark, optionally narrowed to one kind of machine.
   *
   * The hardware tables always describe the whole board; the filter only
   * changes the figures above them, so the row you would click to change your
   * mind never disappears.
   */
  stats: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .input(
      z
        .object({
          dimension: z.enum(["storage", "vendor", "family", "model", "ram"]),
          id: z.string().max(32),
        })
        .optional(),
    )
    .query(({ input }) => loadStats(input)),

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

  /**
   * Entries matching part of a handle, whatever page they are on.
   *
   * Fifty to a page. Past that someone's own entry is invisible to them, and
   * so is every way to claim it. Not `handleSchema`: a half-typed handle is
   * not a valid one, and refusing it would break the search on every keystroke
   * but the last.
   */
  search: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .input(z.object({ query: z.string().max(32) }))
    .query(({ input }) => searchEntries(input.query)),

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
   * Takes over an entry that was ranked as a guest.
   *
   * The handle names which entry was asked for; it is never authority. The
   * server acts only where X's answer matches it, and says so plainly when it
   * does not — a claim on someone else's entry has to explain itself rather
   * than quietly do nothing.
   */
  claim: publicProcedure
    .use(throttled(claimLimit, "Too many attempts. Try again later."))
    .input(z.object({ handle: handleSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const identity = await identityFrom(ctx.headers)
        if (!identity) {
          return {
            ok: false as const,
            error: "Prove the entry with X first.",
            field: "handle" as const,
          }
        }
        return await claimEntry(identity, input.handle)
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
