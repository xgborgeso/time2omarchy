import { describe, expect, it } from "vitest"
import { check, clientKey } from "@/lib/ratelimit"

const WINDOW = { windowMs: 60_000, max: 3 }

describe("check", () => {
  it("allows a caller under the limit", () => {
    const first = check([], 1000, WINDOW)
    expect(first.allowed).toBe(true)
    expect(first.hits).toEqual([1000])
  })

  it("blocks the request that would exceed the limit", () => {
    const blocked = check([1000, 1001, 1002], 1003, WINDOW)
    expect(blocked.allowed).toBe(false)
  })

  it("does not record a blocked attempt, so hammering cannot extend the block", () => {
    const blocked = check([1000, 1001, 1002], 1003, WINDOW)
    expect(blocked.hits).toEqual([1000, 1001, 1002])
  })

  it("forgets hits that fell out of the window", () => {
    // The three hits are older than 60s, so the window is empty again.
    const later = check([1000, 1001, 1002], 62_000, WINDOW)
    expect(later.allowed).toBe(true)
    expect(later.hits).toEqual([62_000])
  })

  it("reports when the oldest hit expires, rounded up", () => {
    const blocked = check([1000, 2000, 3000], 4000, WINDOW)
    // The oldest hit leaves the window at 61_000, which is 57s away.
    expect(blocked.retryAfterSeconds).toBe(57)
  })

  it("reports no wait when the caller is allowed", () => {
    expect(check([], 1000, WINDOW).retryAfterSeconds).toBe(0)
  })
})

describe("clientKey", () => {
  it("keys on the caller's own address", () => {
    expect(clientKey("10.0.0.1")).toBe("10.0.0.1")
  })

  it("never returns an empty key, so unknown callers share one bucket", () => {
    // Giving each unidentifiable caller its own bucket would be no limit at all.
    expect(clientKey(null)).toBe("unknown")
    expect(clientKey("   ")).toBe("unknown")
  })
})

describe("Limiter", () => {
  it("carries a caller's window across calls", async () => {
    const { Limiter } = await import("@/server/ratelimit")
    const limiter = new Limiter({ windowMs: 60_000, max: 2 })
    expect(limiter.check("a", 1000).allowed).toBe(true)
    expect(limiter.check("a", 1001).allowed).toBe(true)
    expect(limiter.check("a", 1002).allowed).toBe(false)
  })

  it("keeps callers independent", async () => {
    const { Limiter } = await import("@/server/ratelimit")
    const limiter = new Limiter({ windowMs: 60_000, max: 1 })
    expect(limiter.check("a", 1000).allowed).toBe(true)
    expect(limiter.check("b", 1000).allowed).toBe(true)
  })

  it("stays bounded when a caller rotates addresses", async () => {
    // Rotating the key is free for an attacker, so an unbounded map of buckets
    // would be a memory exhaustion vector in its own right.
    const { Limiter } = await import("@/server/ratelimit")
    const limiter = new Limiter({ windowMs: 60_000, max: 1 }, 100)
    for (let i = 0; i < 5000; i++) limiter.check(`ip-${i}`, 1000)
    expect(limiter.size).toBeLessThanOrEqual(100)
  })

  it("evicts the least recently seen caller first", async () => {
    const { Limiter } = await import("@/server/ratelimit")
    const limiter = new Limiter({ windowMs: 60_000, max: 1 }, 2)
    limiter.check("old", 1000)
    limiter.check("keep", 1000)
    limiter.check("keep", 1001) // touched, so "old" is now the coldest
    limiter.check("new", 1000)
    expect(limiter.check("keep", 1002).allowed).toBe(false)
    expect(limiter.check("old", 1002).allowed).toBe(true)
  })
})
