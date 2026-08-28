import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Distribution } from "@/components/stats/Distribution"
import { StatTile } from "@/components/stats/StatTile"
import { Trend } from "@/components/stats/Trend"
import { YourRank } from "@/components/stats/YourRank"
import { TIME_BUCKETS } from "@/lib/stats"
import type { StatsResponse } from "@/lib/types"

const buckets = TIME_BUCKETS.map((b, i) => ({ ...b, count: i === 0 ? 3 : 1 }))

function stats(over: Partial<StatsResponse> = {}): StatsResponse {
  return {
    distribution: buckets,
    hardware: { storage: [], vendor: [], ram: [] },
    daily: [
      { day: "2026-01-01", count: 2 },
      { day: "2026-01-02", count: 5 },
    ],
    entries: 9,
    fastestSeconds: 43,
    medianSeconds: 64,
    meanSeconds: 70,
    visitorsToday: 4,
    viewsToday: 20,
    rankedToday: 1,
    online: 2,
    ...over,
  }
}

describe("StatTile", () => {
  it("shows its label and value", () => {
    render(<StatTile label="Fastest" value="43s" />)
    expect(screen.getByText("Fastest")).toBeInTheDocument()
    expect(screen.getByText("43s")).toBeInTheDocument()
  })

  it("omits the note entirely when there isn't one", () => {
    const { container } = render(<StatTile label="Ranked" value="9" />)
    expect(container.querySelectorAll("span")).toHaveLength(2)
  })
})

describe("Distribution", () => {
  it("labels every bucket in the scale", () => {
    // Labels appear on both the bars and the axis, hence getAllByText.
    render(<Distribution buckets={buckets} total={9} medianSeconds={64} />)
    expect(screen.getAllByText(buckets[0]!.label).length).toBeGreaterThan(0)
    expect(screen.getAllByText(buckets.at(-1)!.label).length).toBeGreaterThan(0)
  })

  it("keeps every count readable at the scale the board is aiming for", () => {
    // 10k entries is the point of the thing. Bare digits stop being legible
    // somewhere around four of them.
    const busy = TIME_BUCKETS.map((b, i) => ({ ...b, count: i === 0 ? 12345 : 900 }))
    render(<Distribution buckets={busy} total={20_000} medianSeconds={64} />)
    expect(screen.getByText("12,345")).toBeInTheDocument()
    expect(screen.getByText(/20,000 ranked/)).toBeInTheDocument()
  })

  it("draws a hovered bucket above the median marker, never under it", () => {
    // They occupy the same corner: the label used to be painted over the
    // tooltip, which read as one bloated smear of overlapping text.
    const { container } = render(
      <Distribution buckets={buckets} total={9} medianSeconds={64} />,
    )
    const tooltip = container.querySelector("[role=tooltip]")
    const marker = container.querySelector("[data-slot=median-label]")
    expect(tooltip).not.toBeNull()
    expect(marker).not.toBeNull()
    const layer = (el: Element | null) =>
      Number(/z-(\d+)/.exec(el?.className ?? "")?.[1] ?? 0)
    expect(layer(tooltip)).toBeGreaterThan(layer(marker))
  })

  it("renders without a median, which an empty board has", () => {
    const empty = TIME_BUCKETS.map((b) => ({ ...b, count: 0 }))
    render(<Distribution buckets={empty} total={0} medianSeconds={null} />)
    expect(screen.getAllByText(empty[0]!.label).length).toBeGreaterThan(0)
  })
})

describe("Trend", () => {
  it("summarises the window and its peak", () => {
    render(<Trend daily={stats().daily} />)
    expect(
      screen.getByRole("heading", { name: /ranked, last 2 days/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("peak 5")).toBeInTheDocument()
  })

  it("draws one bar per day", () => {
    render(<Trend daily={stats().daily} />)
    expect(screen.getAllByRole("tooltip")).toHaveLength(2)
  })

  it("survives a run of empty days without dividing by zero", () => {
    // Every count zero makes the y-axis max zero — the classic NaN path.
    const flat = [
      { day: "2026-01-01", count: 0 },
      { day: "2026-01-02", count: 0 },
    ]
    const { container } = render(<Trend daily={flat} />)
    expect(container.innerHTML).not.toContain("NaN")
  })
})

describe("YourRank", () => {
  it("says nothing until a usable time is typed", () => {
    render(<YourRank stats={stats()} />)
    expect(screen.queryByText(/faster than/i)).toBeNull()
  })

  it("places a typed time against the board", async () => {
    render(<YourRank stats={stats()} />)
    await userEvent.type(screen.getByLabelText(/your time/i), "43")
    expect(await screen.findByText(/faster than/i)).toBeInTheDocument()
  })

  it("ignores a time outside the accepted range", async () => {
    render(<YourRank stats={stats()} />)
    await userEvent.type(screen.getByLabelText(/your time/i), "9999")
    expect(screen.queryByText(/faster than/i)).toBeNull()
  })
})
