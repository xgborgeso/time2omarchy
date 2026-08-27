import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OmarchyLogo } from "@/components/OmarchyLogo"
import { wordmarkBaselineOffset, wordmarkHeight } from "@/lib/wordmark"

describe("OmarchyLogo", () => {
  it("is labelled, since it carries the brand name as an image", () => {
    render(<OmarchyLogo />)
    expect(screen.getByLabelText("Omarchy")).toBeInTheDocument()
  })

  it("keeps the wordmark's aspect ratio at any width", () => {
    render(<OmarchyLogo width={128} />)
    const svg = screen.getByLabelText("Omarchy")
    expect(svg).toHaveAttribute("width", "128")
    expect(svg).toHaveAttribute("height", String(wordmarkHeight(128)))
  })

  it("nudges the wordmark onto the text baseline", () => {
    // Flexbox aligns replaced elements by their box bottom, not their glyph
    // baseline, which once rendered this 1.58px above the text beside it.
    render(<OmarchyLogo width={64} />)
    const offset = wordmarkBaselineOffset(wordmarkHeight(64))
    expect(screen.getByLabelText("Omarchy")).toHaveStyle({
      transform: `translateY(${offset}px)`,
    })
  })
})
