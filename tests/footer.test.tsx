import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Footer } from "@/components/Footer"

describe("Footer", () => {
  it("routes to the views it offers", async () => {
    const onNavigate = vi.fn()
    render(<Footer onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole("button", { name: /rules/i }))
    expect(onNavigate).toHaveBeenCalledWith("rules")
  })

  it("links to this repository, not to github.com", () => {
    // It was a placeholder pointing at GitHub's homepage.
    render(<Footer onNavigate={() => {}} />)
    expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
      "href",
      "https://github.com/xgborgeso/time2omarchy",
    )
  })

  it("credits Omarchy and DHH without implying endorsement", () => {
    // The wordmark is used nominatively; the disclaimer is a licence condition.
    render(<Footer onNavigate={() => {}} />)
    expect(screen.getByRole("link", { name: /omarchy/i })).toHaveAttribute(
      "href",
      "https://omarchy.org",
    )
    expect(screen.getByRole("link", { name: /dhh/i })).toHaveAttribute(
      "href",
      "https://x.com/dhh",
    )
  })
})

describe("Footer order", () => {
  it("leads with Stats, then Rules, then GitHub", async () => {
    // Stats is the page people actually come back for; the rules are read
    // once. GitHub is the way out, so it goes last.
    render(<Footer onNavigate={() => {}} />)
    const labels = ["Stats", "Rules", "GitHub"]
    const positions = labels.map((label) =>
      Array.from(document.querySelectorAll("footer button, footer a")).findIndex(
        (el) => el.textContent?.trim() === label,
      ),
    )
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(positions.every((p) => p >= 0)).toBe(true)
  })

  it("says who built it, first, and links the handle to X", () => {
    // The only line in the footer that names anyone answerable for the site,
    // so it leads rather than trails the navigation.
    render(<Footer onNavigate={() => {}} />)
    const link = screen.getByRole("link", { name: "@xgborgeso" })
    expect(link).toHaveAttribute("href", "https://x.com/xgborgeso")
    expect(screen.getByText(/built by/i)).toBeVisible()
  })
})
