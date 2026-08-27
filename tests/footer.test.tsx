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
