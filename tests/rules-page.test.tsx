import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RulesPage } from "@/components/RulesPage"

describe("RulesPage", () => {
  it("numbers the rules with a real list, so the markers align", () => {
    // These were hand-rolled spans once and drifted out of alignment.
    render(<RulesPage />)
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(6)
  })

  it("states the two rules the ranking code actually enforces", () => {
    render(<RulesPage />)
    expect(screen.getByText(/rank is by time alone/i)).toBeInTheDocument()
    expect(screen.getByText(/equal times share a rank/i)).toBeInTheDocument()
  })

  it("explains what claiming buys, since the board shows a mark for it", () => {
    render(<RulesPage />)
    expect(screen.getByText(/signing in with x is optional/i)).toBeInTheDocument()
  })

  it("says a guest entry can be claimed later, which is not obvious", () => {
    // Someone who ranked as a guest has to be told the entry is still theirs to
    // take, or the only way they find out is by trying.
    render(<RulesPage />)
    expect(screen.getByText(/claim it later/i)).toBeInTheDocument()
  })

  it("uses one word for the action, and keeps 'verified' for the state", () => {
    // "Verify your handle" and "claim your entry" were the same operation
    // under two names. The action is claiming; the badge is what it earns.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/verify|verifying/i)
  })
})
