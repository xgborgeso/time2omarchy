import { describe, expect, it } from "vitest"
import { cacheHeaders } from "@/lib/cache-control"

const query = { type: "query" as const, hasErrors: false }

describe("cacheHeaders", () => {
  it("lets a CDN answer the board poll instead of the origin", () => {
    // Every open tab polls the board every 10s. Ten thousand tabs is a
    // thousand requests a second, and none of them need a private answer.
    expect(cacheHeaders(["board"], query)["cache-control"]).toBe(
      "public, s-maxage=10, stale-while-revalidate=30",
    )
  })

  it("holds the CPU catalogue far longer, since it is a constant", () => {
    expect(cacheHeaders(["cpus"], query)["cache-control"]).toContain("s-maxage=3600")
  })

  it("never caches a mutation", () => {
    expect(cacheHeaders(["visit"], { type: "mutation", hasErrors: false })).toEqual({})
  })

  it("never caches a batch that carries anything uncacheable", () => {
    // tRPC batches, and a batch is one response: caching it would serve one
    // person's rank result to the next caller.
    expect(cacheHeaders(["board", "visit"], query)).toEqual({})
    expect(cacheHeaders(["board", "claim"], query)).toEqual({})
  })

  it("never caches an error", () => {
    // A rate-limit or a failure would otherwise stick to the edge.
    expect(cacheHeaders(["board"], { type: "query", hasErrors: true })).toEqual({})
  })
})
