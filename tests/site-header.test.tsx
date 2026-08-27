import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SiteHeader } from "@/components/SiteHeader"

describe("SiteHeader", () => {
  it("offers every view", () => {
    render(<SiteHeader active="board" onNavigate={() => {}} />)
    for (const name of ["Board", "Stats", "Rules"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument()
    }
  })

  it("marks the current view for assistive tech, not just visually", () => {
    render(<SiteHeader active="stats" onNavigate={() => {}} />)
    expect(screen.getByRole("button", { name: "Stats" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("button", { name: "Board" })).not.toHaveAttribute(
      "aria-current",
    )
  })

  it("navigates on click", async () => {
    const onNavigate = vi.fn()
    render(<SiteHeader active="board" onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole("button", { name: "Rules" }))
    expect(onNavigate).toHaveBeenCalledWith("rules")
  })

  it("sends the wordmark home", async () => {
    const onNavigate = vi.fn()
    render(<SiteHeader active="stats" onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole("button", { name: /time2omarchy/i }))
    expect(onNavigate).toHaveBeenCalledWith("board")
  })
})
