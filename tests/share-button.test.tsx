import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ShareButton } from "@/components/ShareButton"

describe("ShareButton", () => {
  const position = { rank: 2, timeSeconds: 64, total: 9 }

  it("says Share once, and lets the logo say where", () => {
    // "X Share on X" named the destination twice: the mark is already the
    // whole of that information.
    render(<ShareButton position={position} />)
    const link = screen.getByRole("link", { name: /share/i })
    expect(link).toHaveTextContent(/^Share$/)
    // The mark carries the meaning, so it has to be reachable by name.
    expect(link.querySelector("svg")).toHaveAttribute("aria-label", "X")
  })

  it("opens X's intent with the position in the text", () => {
    render(<ShareButton position={position} />)
    const href = screen.getByRole("link", { name: /share/i }).getAttribute("href") ?? ""
    expect(href).toContain("x.com/intent")
    // Decoded, so the assertion survives a change of encoder.
    expect(decodeURIComponent(href)).toContain("1:04")
  })

  it("opens in a new tab without handing X window.opener", () => {
    render(<ShareButton position={position} />)
    const link = screen.getByRole("link", { name: /share/i })
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })
})
