import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HeroSteps } from "@/components/HeroSteps"
import { StatStrip } from "@/components/StatStrip"
import type { Counters } from "@/lib/types"

const counters: Counters = {
  fastestSeconds: 117,
  medianSeconds: 161,
  leaderHandle: "ada",
  leaderCount: 1,
  entries: 2,
  visitorsToday: 40,
  online: 1,
  visitors: 900,
}

describe("StatStrip", () => {
  it("leads with the time, not the count", () => {
    // A two-entry board opening with "2" reads as abandoned; opening with a
    // time reads as something to measure yourself against.
    render(<StatStrip counters={counters} />)
    const labels = screen.getAllByText(/median|ranked/).map((n) => n.textContent)
    expect(labels).toEqual(["median", "ranked"])
  })

  it("never repeats the number the hero is already shouting", () => {
    // Regression: the strip carried "fastest" too, so the same time appeared
    // twice within one glance — once at 76px and once at 18px.
    render(<StatStrip counters={counters} />)
    expect(screen.queryByText(/fastest/i)).toBeNull()
    expect(screen.queryByText("1:57")).toBeNull()
  })

  it("shows the figures it was given", () => {
    render(<StatStrip counters={counters} />)
    // formatTime's own shape, not a second opinion about it: "2:41", not "2m 41s".
    expect(screen.getByText("2:41")).toBeVisible()
    expect(screen.getByText("2")).toBeVisible()
  })

  it("says out loud that it is a door", () => {
    // Three numbers in a box do not look clickable. Without this line the
    // strip is decoration and the stats page stays undiscovered.
    render(<StatStrip counters={counters} />)
    expect(screen.getByRole("link", { name: /see all stats/i })).toHaveAttribute(
      "href",
      "#stats",
    )
  })

  it("makes every number a way through", () => {
    render(<StatStrip counters={counters} />)
    const links = screen.getAllByRole("link")
    expect(links.length).toBe(3)
    for (const link of links) expect(link).toHaveAttribute("href", "#stats")
  })

  it("stays away when there is nothing behind it", () => {
    // An empty board's stats page is a row of dashes. Inviting somebody
    // through to that is worse than not inviting them.
    const { container } = render(<StatStrip counters={{ ...counters, entries: 0 }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing before the board has loaded", () => {
    const { container } = render(<StatStrip counters={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("survives a board with no median yet", () => {
    render(<StatStrip counters={{ ...counters, medianSeconds: null }} />)
    expect(screen.getByText("—")).toBeVisible()
  })
})

describe("HeroSteps", () => {
  it("names three actions, and does not count the outcome as one", () => {
    // "Ranked" is what happens, not something you do. Naming it made the row
    // longer without telling anybody anything.
    render(<HeroSteps />)
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.queryByText(/^ranked$/i)).toBeNull()
  })

  it("puts sign-in in the middle, where the app actually puts it", () => {
    // The form comes after X, not before: RankDialog sends you to X first and
    // only opens the dialog on the way back. A diagram in the wrong order is
    // worse than no diagram.
    render(<HeroSteps />)
    const said = screen.getAllByRole("listitem").map((n) => n.textContent ?? "")
    expect(said[0]).toMatch(/boot screen/i)
    expect(said[1]).toMatch(/sign in/i)
    expect(said[2]).toMatch(/time and machine/i)
  })
})
