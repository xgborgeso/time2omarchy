import { z } from "zod"
import { searchCpus } from "../../lib/cpus"
import { specsSchema } from "../../lib/specs"
import { handleSchema, timeSchema } from "../../lib/validation"
import { loadBoard, loadStats, searchEntries } from "../board"
import { identityFrom } from "../identity"
import { submitRank } from "../rank"
import { Limiter } from "../ratelimit"
import { captureError } from "../report"
import { reportEntry } from "../reports"
import { touchPresence } from "../stats"
import { visitorIdFrom } from "../visitor"
import { publicProcedure, router, throttled } from "./init"

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

/** Reads are generous; writes are cheap to send and expensive to serve. */
const readLimit = new Limiter({ windowMs: MINUTE, max: 300 })
const rankLimit = new Limiter({ windowMs: HOUR, max: 8 })
/**
 * Generous, because the table dedupes anyway.
 *
 * The limit is here to stop someone writing rows all afternoon, not to ration
 * honest reports — a person who genuinely finds twenty bad images should be
 * able to flag all twenty.
 */
const reportLimit = new Limiter({ windowMs: HOUR, max: 20 })

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
   * so is every way to verify it. Not `handleSchema`: a half-typed handle is
   * not a valid one, and refusing it would break the search on every keystroke
   * but the last.
   */
  search: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .input(z.object({ query: z.string().max(32) }))
    .query(({ input }) => searchEntries(input.query)),

  /**
   * The handle X answered with, or null.
   *
   * Not a session in the usual sense — there is no signed-in state to show and
   * nothing to sign out of. The form asks this once so it knows whether to
   * send someone to X before letting them fill anything in.
   */
  me: publicProcedure
    .use(throttled(readLimit, "Too many requests."))
    .query(async ({ ctx }) => {
      const identity = await identityFrom(ctx.headers)
      return { handle: identity?.handle ?? null }
    }),

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
   * Flags a boot screen for review.
   *
   * Records and notifies; it never hides anything on its own. Auto-hiding on
   * a count is how a brigade takes the leader off the board, so what a report
   * buys is a human looking, not an outcome.
   */
  report: publicProcedure
    .use(throttled(reportLimit, "Too many reports. Try again later."))
    .input(z.object({ handle: handleSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reportEntry(input.handle, ctx.clientKey)
      } catch (err) {
        await captureError(err)
        return { ok: false as const, error: "Could not send that report." }
      }
    }),

  rank: publicProcedure
    .use(throttled(rankLimit, "Slow down. Try again in an hour."))
    .input(
      z
        .object({
          // Parsed here so "1:12" and "43s" keep working; the client sends text.
          time: timeSchema,
          bootScreenUrl: z.string().min(1),
          // Flat, and short: it names one stored file and nothing else.
          bootScreenKey: z.string().min(1).max(256),
          bootScreenThumbUrl: z.string().min(1),
          bootScreenThumbKey: z.string().min(1).max(256),
        })
        .extend(specsSchema.shape),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // No handle in the input at all: the only name an entry can carry is
        // the one X answered with, so there is nothing to impersonate.
        const identity = await identityFrom(ctx.headers)
        if (!identity) {
          return {
            ok: false as const,
            error: "Connect X before ranking.",
            field: "form" as const,
            needsSignIn: true,
          }
        }
        return await submitRank({
          identity,
          timeSeconds: input.time,
          bootScreenUrl: input.bootScreenUrl,
          bootScreenKey: input.bootScreenKey,
          bootScreenThumbUrl: input.bootScreenThumbUrl,
          bootScreenThumbKey: input.bootScreenThumbKey,
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
