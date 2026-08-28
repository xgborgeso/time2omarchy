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
    hardware: { storage: [], cpu: [], cpuLevel: "vendor", cpuParent: null, ram: [] },
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
    render(<StatTile label="Ranked" value="9" />)
    expect(screen.getByText("Ranked")).toBeVisible()
    expect(screen.getByText("9")).toBeVisible()
    expect(screen.queryByText(/today/)).toBeNull()
  })
})

describe("Distribution", () => {
  /**
   * These assert what this component contributes — its heading, its summary
   * line and its empty state. The bars, axis and tooltip belong to Recharts;
   * testing those would be testing the chart library.
   */
  it("names the bucket most installs land in", () => {
    const busy = TIME_BUCKETS.map((b, i) => ({ ...b, count: i === 1 ? 40 : 1 }))
    render(<Distribution buckets={busy} total={48} medianSeconds={64} />)
    expect(screen.getByText(`Most land in ${busy[1]!.label}.`)).toBeVisible()
  })

  it("says so plainly when nothing has been ranked", () => {
    const empty = TIME_BUCKETS.map((b) => ({ ...b, count: 0 }))
    render(<Distribution buckets={empty} total={0} medianSeconds={null} />)
    expect(screen.getByText("Nothing ranked yet.")).toBeVisible()
  })

  it("renders without a median, which an empty board has", () => {
    const empty = TIME_BUCKETS.map((b) => ({ ...b, count: 0 }))
    render(<Distribution buckets={empty} total={0} medianSeconds={null} />)
    expect(screen.getByText("Install times")).toBeVisible()
  })
})

describe("Trend", () => {
  it("summarises the window and its peak", () => {
    // CardTitle is a div, not a heading: the page's one <h1> is "Stats", and
    // a card title below it is a label rather than a section of the document.
    render(<Trend daily={stats().daily} />)
    expect(screen.getByText(/ranked, last 2 days/i)).toBeVisible()
    expect(screen.getByText(/peak 5 in a day/i)).toBeVisible()
  })

  it("survives an empty window rather than dividing by nothing", () => {
    render(<Trend daily={[]} />)
    expect(screen.getByText(/ranked, last 0 days/i)).toBeVisible()
    expect(screen.getByText(/peak 0 in a day/i)).toBeVisible()
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
