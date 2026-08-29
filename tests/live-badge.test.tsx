import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { LiveBadge } from "@/components/LiveBadge"
import type { Counters } from "@/lib/types"

const counters: Counters = {
  fastestSeconds: 26,
  leaderHandle: "ada",
  leaderCount: 1,
  entries: 120,
  visitorsToday: 40,
  online: 2,
  visitors: 13985,
  pageviews: 34521,
}

describe("LiveBadge", () => {
  it("never shows the live number without the total beside it", () => {
    // "2 online" alone reads as an empty room. The cumulative figure is what
    // makes the same number read as activity, so it is not optional.
    render(<LiveBadge counters={counters} onNavigate={() => {}} />)
    expect(screen.getByText("2 online")).toBeVisible()
    expect(screen.getByText(/13,985 visitors/)).toBeVisible()
  })

  it("groups the thousands, because the total is the point", () => {
    render(<LiveBadge counters={counters} onNavigate={() => {}} />)
    expect(screen.queryByText(/13985/)).toBeNull()
  })

  it("says nothing about the board, which is a different subject", () => {
    // The ranked count sat here once. It made the pill the one place the two
    // were mixed, and the Stats page already carries it.
    render(<LiveBadge counters={counters} onNavigate={() => {}} />)
    expect(screen.queryByText(/ranked/i)).toBeNull()
  })

  it("goes where it says when pressed", async () => {
    const onNavigate = vi.fn()
    const user = userEvent.setup()
    render(<LiveBadge counters={counters} onNavigate={onNavigate} />)
    await user.click(screen.getByRole("button", { name: /see analytics/i }))
    expect(onNavigate).toHaveBeenCalled()
  })

  it("says one visitor rather than 1 visitors", () => {
    render(<LiveBadge counters={{ ...counters, visitors: 1 }} onNavigate={() => {}} />)
    expect(screen.getByText(/1 visitor$/)).toBeVisible()
  })

  it("renders nothing before the counters have loaded", () => {
    const { container } = render(<LiveBadge counters={undefined} onNavigate={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
