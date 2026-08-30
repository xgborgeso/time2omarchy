import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LiveBadge } from "@/components/LiveBadge"
import type { Counters } from "@/lib/types"

const counters: Counters = {
  fastestSeconds: 26,
  medianSeconds: 184,
  leaderHandle: "ada",
  leaderCount: 1,
  entries: 120,
  visitorsToday: 40,
  // Above the threshold: below it the badge renders nothing at all, which
  // every assertion here would otherwise trip over.
  online: 4,
  visitors: 13985,
}

describe("LiveBadge", () => {
  it("never shows the live number without the total beside it", () => {
    // "2 online" alone reads as an empty room. The cumulative figure is what
    // makes the same number read as activity, so it is not optional.
    render(<LiveBadge counters={counters} />)
    expect(screen.getByText("4 online")).toBeVisible()
    expect(screen.getByText(/13,985 visitors/)).toBeVisible()
  })

  it("groups the thousands, because the total is the point", () => {
    render(<LiveBadge counters={counters} />)
    expect(screen.queryByText(/13985/)).toBeNull()
  })

  it("says nothing about the board, which is a different subject", () => {
    // The ranked count sat here once. It made the pill the one place the two
    // were mixed, and the Stats page already carries it.
    render(<LiveBadge counters={counters} />)
    expect(screen.queryByText(/ranked/i)).toBeNull()
  })

  it("offers no analytics link until there is a dashboard to open", () => {
    // The dashboard is hosted elsewhere. With nothing configured the badge is
    // just the numbers — an empty internal page would be worse than none.
    render(<LiveBadge counters={counters} />)
    expect(screen.queryByRole("link", { name: /analytics/i })).toBeNull()
  })

  it("says one visitor rather than 1 visitors", () => {
    render(<LiveBadge counters={{ ...counters, visitors: 1 }} />)
    expect(screen.getByText(/1 visitor$/)).toBeVisible()
  })

  it("renders nothing before the counters have loaded", () => {
    const { container } = render(<LiveBadge counters={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("says nothing at all when the room is quiet", () => {
    // A pulsing dot next to "1 online" in the most prominent spot on the page
    // advertises that nobody is here. Silence beats discouraging.
    for (const online of [0, 1, 2]) {
      const { container } = render(<LiveBadge counters={{ ...counters, online }} />)
      expect(container).toBeEmptyDOMElement()
    }
  })

  it("comes back on its own once there is a crowd", () => {
    // Hidden, not deleted: the writes behind it keep running, so a busy day
    // restores the badge without anybody switching it on.
    render(<LiveBadge counters={{ ...counters, online: 3 }} />)
    expect(screen.getByText("3 online")).toBeVisible()
  })
})

describe("LiveBadge with a dashboard configured", () => {
  it("links out to it, rather than to a page of our own", async () => {
    vi.resetModules()
    vi.doMock("@/lib/links", () => ({ ANALYTICS_URL: "https://datafa.st/share/x" }))
    const { LiveBadge: Configured } = await import("@/components/LiveBadge")

    render(<Configured counters={counters} />)
    const link = screen.getByRole("link", { name: /see analytics/i })
    expect(link).toHaveAttribute("href", "https://datafa.st/share/x")
    // A new tab: the dashboard is somebody else's site, not a view of this one.
    expect(link).toHaveAttribute("target", "_blank")
  })
})
