import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Hero } from "@/components/Hero"
import type { Counters } from "@/lib/types"

function counters(over: Partial<Counters> = {}): Counters {
  return {
    fastestSeconds: 43,
    leaderHandle: "ada",
    leaderCount: 1,
    entries: 8,
    visitorsToday: 3,
    online: 2,
    ...over,
  }
}

describe("Hero", () => {
  it("leads with the time to beat", () => {
    render(<Hero counters={counters()} />)
    expect(screen.getByText("BEAT")).toBeInTheDocument()
    expect(screen.getByText("43s")).toBeInTheDocument()
  })

  it("formats a time over a minute rather than printing seconds", () => {
    render(<Hero counters={counters({ fastestSeconds: 64 })} />)
    expect(screen.getByText("1:04")).toBeInTheDocument()
  })

  it("invites the first entry when the board is empty", () => {
    // Nothing to beat yet, so the call to action has to change entirely.
    render(
      <Hero
        counters={counters({ fastestSeconds: null, leaderHandle: null, leaderCount: 0 })}
      />,
    )
    expect(screen.getByText("BE")).toBeInTheDocument()
    expect(screen.getByText("FIRST")).toBeInTheDocument()
  })

  it("names a sole leader", () => {
    render(<Hero counters={counters()} />)
    expect(screen.getByText(/@ada holds it/)).toBeInTheDocument()
  })

  it("counts the holders instead of naming one when the top is tied", () => {
    render(<Hero counters={counters({ leaderCount: 3 })} />)
    expect(screen.getByText(/3 share it/)).toBeInTheDocument()
    expect(screen.queryByText(/@ada/)).toBeNull()
  })

  it("survives having no counters at all, as on first paint", () => {
    render(<Hero counters={undefined} />)
    expect(screen.getByText("BE")).toBeInTheDocument()
  })
})
