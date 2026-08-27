import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StatsPage } from "@/components/stats/StatsPage"
import { TIME_BUCKETS } from "@/lib/stats"
import type { StatsResponse } from "@/lib/types"

const statsFn = vi.fn()

vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    stats: {
      queryOptions: (_input: unknown, opts: Record<string, unknown>) => ({
        queryKey: ["stats"],
        queryFn: statsFn,
        ...opts,
        // A failed fetch is a state this component renders, not an exception
        // for the test runner to catch.
        throwOnError: false,
        retry: false,
        refetchInterval: false,
      }),
    },
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const stats: StatsResponse = {
  distribution: TIME_BUCKETS.map((b) => ({ ...b, count: 1 })),
  daily: [{ day: "2026-01-01", count: 2 }],
  entries: 9,
  fastestSeconds: 43,
  medianSeconds: 64,
  meanSeconds: 70,
  visitorsToday: 4,
  viewsToday: 20,
  rankedToday: 1,
  online: 2,
}

beforeEach(() => statsFn.mockReset())

describe("StatsPage", () => {
  it("shows placeholders while loading rather than an empty page", async () => {
    // Resolvable, not eternal: an unsettled promise hangs test teardown.
    let release!: (value: StatsResponse) => void
    statsFn.mockReturnValue(new Promise<StatsResponse>((r) => (release = r)))

    const { container } = render(<StatsPage />, { wrapper })
    expect(screen.queryByRole("heading", { name: "Stats" })).toBeNull()
    expect(container).not.toBeEmptyDOMElement()

    release(stats)
    expect(await screen.findByRole("heading", { name: "Stats" })).toBeInTheDocument()
  })

  it("renders the aggregates once loaded", async () => {
    statsFn.mockResolvedValue(stats)
    render(<StatsPage />, { wrapper })
    expect(await screen.findByRole("heading", { name: "Stats" })).toBeInTheDocument()
    expect(screen.getByText("43s")).toBeInTheDocument()
  })

  it("says so when there are no stats, instead of rendering zeroes", async () => {
    // Zeroes would read as "nobody has ranked", which is a different claim.
    // Resolving null exercises the same branch as a failed fetch without a
    // rejection the runner reports as unhandled before React Query sees it.
    statsFn.mockResolvedValue(null)
    render(<StatsPage />, { wrapper })
    expect(await screen.findByText(/could not load stats/i)).toBeInTheDocument()
  })
})
