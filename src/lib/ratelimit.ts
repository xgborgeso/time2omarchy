/**
 * Sliding-window rate limiting.
 *
 * The window is kept as a list of hit timestamps rather than a counter so a
 * caller cannot bank a quiet minute and then spend it all at once, and so the
 * wait can be reported honestly.
 */

export type Window = {
  windowMs: number
  max: number
}

export type Decision = {
  allowed: boolean
  /** The window after this request, ready to store. */
  hits: number[]
  /** Seconds until the caller may retry. Zero when allowed. */
  retryAfterSeconds: number
}

export function check(hits: readonly number[], now: number, window: Window): Decision {
  const live = hits.filter((t) => now - t < window.windowMs)

  if (live.length >= window.max) {
    // A blocked attempt is not recorded. Otherwise hammering the endpoint would
    // keep pushing the window forward and turn a pause into a permanent block.
    const oldest = live[0] ?? now
    const waitMs = window.windowMs - (now - oldest)
    return {
      allowed: false,
      hits: live,
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
    }
  }

  return { allowed: true, hits: [...live, now], retryAfterSeconds: 0 }
}

/**
 * The key a caller is limited by.
 *
 * The direct socket address and nothing else. Forwarded headers are not read:
 * with no proxy in front a caller sets them itself, which would hand everyone
 * an unlimited supply of identities — the same hole a cookie-keyed limit had.
 * Proxy awareness belongs here again the day this runs behind one.
 */
export function clientKey(socketAddress: string | null): string {
  const direct = socketAddress?.trim()
  if (direct) return direct

  // One shared bucket is the safe default: unknown callers throttle each other
  // rather than each getting a private allowance.
  return "unknown"
}
