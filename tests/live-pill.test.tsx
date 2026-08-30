import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LivePill } from "@/components/LivePill"
import type { Audience } from "@/lib/types"

const audience: Audience = { online: 4, visitors: 13_985 }

describe("LivePill", () => {
  it("never shows the live number without the total beside it", () => {
    // "4 online" alone reads as an empty room. The cumulative figure is what
    // makes the same number read as activity, so it is not optional.
    render(<LivePill audience={audience} />)
    expect(screen.getByText("4 online")).toBeVisible()
    expect(screen.getByText(/13,985 visitors/)).toBeVisible()
  })

  it("groups the thousands, because the total is the point", () => {
    render(<LivePill audience={audience} />)
    expect(screen.queryByText(/13985/)).toBeNull()
  })

  it("says one visitor rather than 1 visitors", () => {
    render(<LivePill audience={{ ...audience, visitors: 1 }} />)
    expect(screen.getByText(/1 visitor$/)).toBeVisible()
  })

  it("renders nothing when the numbers could not be fetched", () => {
    // Null is every failure at once — no key, a bad key, a timeout, an
    // outage, a changed response shape. All of them mean "show nothing"
    // rather than "break the board".
    const { container } = render(<LivePill audience={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("says nothing about the board, which is a different subject", () => {
    // Traffic and install times are the two things the pill and the strip
    // keep apart. Mixing them was what made the old badge confusing.
    render(<LivePill audience={audience} />)
    expect(screen.queryByText(/ranked|median|install/i)).toBeNull()
  })
})

describe("LivePill with a dashboard configured", () => {
  it("links out to it, and calls it analytics rather than stats", async () => {
    // "Stats" is the board's own page, one hash away. This is somebody
    // else's dashboard about traffic, so the two are named differently.
    vi.resetModules()
    vi.doMock("@/lib/links", () => ({ ANALYTICS_URL: "https://datafa.st/share/x" }))
    const { LivePill: Configured } = await import("@/components/LivePill")

    render(<Configured audience={audience} />)
    const link = screen.getByRole("link", { name: /see analytics/i })
    expect(link).toHaveAttribute("href", "https://datafa.st/share/x")
    // A new tab: the dashboard is somebody else's site, not a view of this one.
    expect(link).toHaveAttribute("target", "_blank")
    expect(screen.queryByRole("link", { name: /see stats/i })).toBeNull()
  })
})
