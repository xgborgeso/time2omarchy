import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ShareButton } from "@/components/ShareButton"

describe("ShareButton", () => {
  const position = { rank: 2, timeSeconds: 64, total: 9 }

  it("opens X's intent with the position in the text", () => {
    render(<ShareButton position={position} />)
    const href =
      screen.getByRole("link", { name: /share on x/i }).getAttribute("href") ?? ""
    expect(href).toContain("x.com/intent")
    // Decoded, so the assertion survives a change of encoder.
    expect(decodeURIComponent(href)).toContain("1:04")
  })

  it("opens in a new tab without handing X window.opener", () => {
    render(<ShareButton position={position} />)
    const link = screen.getByRole("link", { name: /share on x/i })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })
})
