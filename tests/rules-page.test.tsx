import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RulesPage } from "@/components/RulesPage"

describe("RulesPage", () => {
  it("numbers the rules with a real list, so the markers align", () => {
    // These were hand-rolled spans once and drifted out of alignment.
    render(<RulesPage />)
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
  })

  it("states the two rules the ranking code actually enforces", () => {
    render(<RulesPage />)
    expect(screen.getByText(/rank is by time alone/i)).toBeInTheDocument()
    expect(screen.getByText(/equal times share a rank/i)).toBeInTheDocument()
  })

  it("explains what verification buys, since the board shows a mark for it", () => {
    render(<RulesPage />)
    expect(screen.getByText(/verifying your handle on x is optional/i)).toBeInTheDocument()
  })
})
