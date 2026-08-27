import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Activity } from "@/components/Activity"
import type { ActivityItem } from "@/lib/types"

const items: ActivityItem[] = [
  { handle: "ada", timeSeconds: 43, updatedAt: "2026-01-01T00:00:00.000Z" },
  { handle: "linus", timeSeconds: 64, updatedAt: "2026-01-02T00:00:00.000Z" },
]

describe("Activity", () => {
  it("lists recent entries with formatted times", () => {
    render(<Activity items={items} onStats={() => {}} />)
    expect(screen.getByRole("link", { name: "@ada" })).toBeInTheDocument()
    expect(screen.getByText("43s")).toBeInTheDocument()
    expect(screen.getByText("1:04")).toBeInTheDocument()
  })

  it("renders nothing at all when there is no activity", () => {
    // An empty "Latest" heading is worse than no section.
    const { container } = render(<Activity items={[]} onStats={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("routes to stats on request", async () => {
    const onStats = vi.fn()
    render(<Activity items={items} onStats={onStats} />)
    await userEvent.click(screen.getByRole("button", { name: /all stats/i }))
    expect(onStats).toHaveBeenCalledOnce()
  })
})
