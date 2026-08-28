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

  it("says the same thing whether the top is held or shared", () => {
    // Ties are the normal case at second granularity, so a line that counted
    // the holders read as a hedge. The leader is credited on the board, where
    // their handle already links to X.
    render(<Hero counters={counters({ leaderCount: 3 })} />)
    expect(screen.getByText(/fastest Omarchy install leaderboard/i)).toBeVisible()
    expect(screen.queryByText(/@ada|share it|holds it/)).toBeNull()
  })

  it("survives having no counters at all, as on first paint", () => {
    render(<Hero counters={undefined} />)
    expect(screen.getByText("BE")).toBeInTheDocument()
  })
})
