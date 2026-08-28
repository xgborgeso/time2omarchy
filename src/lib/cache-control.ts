/**
 * What a CDN may keep, and for how long.
 *
 * The board page is prerendered, but the polling that keeps it live is not:
 * every open tab asks for the board every ten seconds, and at launch scale
 * that is the whole load. None of these reads are per-person, so the edge can
 * answer almost all of them.
 */

/** Seconds a shared cache may serve each read without asking again. */
const MAX_AGE: Record<string, number> = {
  // A leaderboard ten seconds stale is indistinguishable from a live one, and
  // the client polls at exactly this interval anyway.
  board: 10,
  entry: 10,
  stats: 30,
  // The catalogue is a constant in the source; it changes when we deploy.
  cpus: 3600,
}

/** How long the edge may keep serving the old answer while it fetches a new one. */
const STALE_FACTOR = 3

export type RequestShape = {
  type: "query" | "mutation" | "subscription" | "unknown"
  hasErrors: boolean
}

export function cacheHeaders(
  paths: readonly string[],
  { type, hasErrors }: RequestShape,
): Record<string, string> {
  if (type !== "query" || hasErrors || paths.length === 0) return {}

  // A batch is one response. If any part of it is private, none of it can be
  // shared — otherwise one caller's answer is served to the next.
  const ages = paths.map((path) => MAX_AGE[path])
  if (ages.some((age) => age === undefined)) return {}

  const age = Math.min(...(ages as number[]))
  return {
    "cache-control": `public, s-maxage=${age}, stale-while-revalidate=${age * STALE_FACTOR}`,
  }
}
