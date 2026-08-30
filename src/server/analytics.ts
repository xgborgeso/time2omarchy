/**
 * How many people are here, asked of the service that already knows.
 *
 * The site counted this itself once — a uuid cookie and three tables — which
 * was the only reason it set a cookie at all. Datafast already counts, and
 * counts cookielessly, so these two numbers are read back from it instead of
 * measured again. Nothing about a visitor is stored here; what arrives is an
 * aggregate somebody else computed.
 *
 * Server-side only. The key reads a whole site's analytics, so it must never
 * reach a browser — which is why this is not a `NEXT_PUBLIC_` variable and
 * why nothing here runs on the client.
 */

/** Datafast's own shape: `{ status, data: [ { visitors, ... } ] }`. */
type Envelope = { data?: Array<{ visitors?: number }> }

export type Audience = {
  /** People on the site right now. */
  online: number
  /** Unique visitors since the board opened. */
  visitors: number
}

const KEY = process.env.DATAFAST_API_KEY?.trim() || null

/**
 * The board opened in August 2026, and `overview` requires a range rather than
 * offering an all-time total. Anything earlier than the first visit gives the
 * same answer, so this only has to be early, not exact.
 */
const SINCE = "2026-08-01"

/**
 * Long enough that a burst of readers costs one call, short enough that the
 * live number still means "now". The board itself revalidates every 60s, so
 * this mostly prevents client-side navigations from adding calls of their own.
 */
const TTL_MS = 60_000

/**
 * Two seconds, then give up.
 *
 * This is decoration on a page whose real content is already in hand. A slow
 * third party must never hold the board back, so the timeout is far below what
 * a visitor would notice and failure is silent.
 */
const TIMEOUT_MS = 2_000

let cached: { at: number; value: Audience | null } = { at: 0, value: null }

async function ask(path: string): Promise<number | null> {
  const response = await fetch(`https://datafa.st/api/v1/analytics/${path}`, {
    headers: { authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // Our own cache below is the one that matters; this stops Next from
    // holding a copy with different lifetime rules.
    cache: "no-store",
  })
  if (!response.ok) return null

  const body = (await response.json()) as Envelope
  const n = body.data?.[0]?.visitors
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

/**
 * Both figures, or null.
 *
 * Null covers every way this can go wrong — unset key, bad key, timeout,
 * an outage, a changed response shape — because the caller does the same
 * thing with all of them: show nothing. A missing pill is unremarkable; a
 * board that fails to load because an analytics service is down is not.
 */
export async function readAudience(): Promise<Audience | null> {
  if (!KEY) return null

  const now = Date.now()
  if (now - cached.at < TTL_MS) return cached.value

  let value: Audience | null = null
  try {
    const [online, visitors] = await Promise.all([
      ask("realtime"),
      ask(`overview?startAt=${SINCE}&endAt=${new Date().toISOString().slice(0, 10)}`),
    ])
    if (online != null && visitors != null) value = { online, visitors }
  } catch {
    // Deliberately swallowed, and deliberately not reported: a third party
    // being slow is not a fault in this app, and `captureError` is for things
    // somebody should act on.
    value = null
  }

  // Cached either way. A failure that is retried on every request turns one
  // outage into a stampede.
  cached = { at: now, value }
  return value
}
