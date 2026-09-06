import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  hardware: {
    storage: [],
    cpu: [],
    cpuLevel: "vendor",
    cpuParent: null,
    cpuUnlisted: 0,
    ram: [],
  },
  daily: [{ day: "2026-01-01", count: 2 }],
  entries: 9,
  fastestSeconds: 43,
  medianSeconds: 64,
  meanSeconds: 70,
  rankedToday: 1,
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
    // Zeroes would read as "nobody has ranked", which is a different verify.
    // Resolving null exercises the same branch as a failed fetch without a
    // rejection the runner reports as unhandled before React Query sees it.
    statsFn.mockResolvedValue(null)
    render(<StatsPage />, { wrapper })
    expect(await screen.findByText(/could not load stats/i)).toBeInTheDocument()
  })
})

/** The same board, with something to narrow by. */
const withHardware: StatsResponse = {
  ...stats,
  hardware: {
    ...stats.hardware,
    storage: [
      { id: "nvme", label: "NVMe", entries: 8, fastestSeconds: 26, medianSeconds: 41 },
      { id: "hdd", label: "HDD", entries: 1, fastestSeconds: 180, medianSeconds: 240 },
    ],
    cpu: [{ id: "AMD", label: "AMD", entries: 6, fastestSeconds: 26, medianSeconds: 40 }],
    ram: [{ id: "32", label: "32 GB", entries: 5, fastestSeconds: 26, medianSeconds: 44 }],
  },
}

describe("narrowing the page", () => {
  it("names what is being shown once a bucket is chosen", async () => {
    statsFn.mockResolvedValue(withHardware)
    render(<StatsPage />, { wrapper })
    await screen.findByText(/every install ranked here/i)

    const user = userEvent.setup()
    await user.click(screen.getByRole("combobox", { name: /narrow the stats/i }))
    await user.click(await screen.findByRole("option", { name: "HDD" }))

    expect(await screen.findByText(/showing installs on/i)).toBeVisible()
  })

  it("gives back a way to show everything again", async () => {
    // A filter with no way out is a page somebody has to reload to escape.
    statsFn.mockResolvedValue(withHardware)
    render(<StatsPage />, { wrapper })
    await screen.findByText(/every install ranked here/i)

    const user = userEvent.setup()
    await user.click(screen.getByRole("combobox", { name: /narrow the stats/i }))
    await user.click(await screen.findByRole("option", { name: "HDD" }))
    await screen.findByText(/showing installs on/i)

    await user.click(screen.getByRole("button", { name: /show all/i }))
    await waitFor(() => expect(screen.queryByText(/showing installs on/i)).toBeNull())
  })

  it("keeps naming the chosen bucket after the charts move under it", async () => {
    // Drilling swaps the CPU group for the level below, so the bucket that
    // carried the current value can be gone from every chart by the time the
    // line above them is rendered.
    statsFn.mockResolvedValue(withHardware)
    render(<StatsPage />, { wrapper })
    await screen.findByText(/every install ranked here/i)

    const user = userEvent.setup()
    await user.click(screen.getByRole("combobox", { name: /narrow the stats/i }))
    await user.click(await screen.findByRole("option", { name: "AMD" }))

    // The chart it came from is gone; the name is not.
    statsFn.mockResolvedValue({
      ...withHardware,
      hardware: { ...withHardware.hardware, cpu: [] },
    })
    expect(await screen.findByText(/showing installs on/i)).toBeVisible()
  })
})

describe("figures the board cannot supply yet", () => {
  it("draws a dash rather than a number it does not have", async () => {
    // Zeroes would read as "installs take no time", which is worse than
    // admitting there is nothing measured.
    statsFn.mockResolvedValue({
      ...stats,
      entries: 0,
      fastestSeconds: null,
      medianSeconds: null,
      meanSeconds: null,
    })
    render(<StatsPage />, { wrapper })
    await screen.findByText(/every install ranked here/i)

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/^mean /)).toBeNull()
  })
})
