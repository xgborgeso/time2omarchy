import { check, type Decision, type Window } from "../lib/ratelimit"

/**
 * How many callers to remember. Rotating the key is free for an attacker, so
 * the map has to be bounded or it becomes a memory exhaustion vector itself.
 */
const DEFAULT_CAPACITY = 20_000

/**
 * In-process sliding-window limiter with least-recently-seen eviction.
 *
 * Per-process is deliberate: this is a backstop for the origin, not the main
 * defence. Rate limiting that must survive a restart or span instances belongs
 * at the edge, where a flood costs nothing to absorb.
 */
export class Limiter {
  /** Map preserves insertion order, so the first key is the coldest. */
  private readonly buckets = new Map<string, number[]>()

  constructor(
    private readonly window: Window,
    private readonly capacity: number = DEFAULT_CAPACITY,
  ) {}

  get size(): number {
    return this.buckets.size
  }

  check(key: string, now: number = Date.now()): Decision {
    const decision = check(this.buckets.get(key) ?? [], now, this.window)

    // Re-insert so a seen key moves to the warm end of the map.
    this.buckets.delete(key)
    this.buckets.set(key, decision.hits)

    while (this.buckets.size > this.capacity) {
      const coldest = this.buckets.keys().next().value
      if (coldest === undefined) break
      this.buckets.delete(coldest)
    }

    return decision
  }
}
