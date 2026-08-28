import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RulesPage } from "@/components/RulesPage"

describe("RulesPage", () => {
  it("numbers the rules with a real list, so the markers align", () => {
    // These were hand-rolled spans once and drifted out of alignment.
    render(<RulesPage />)
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(7)
  })

  it("states the two rules the ranking code actually enforces", () => {
    render(<RulesPage />)
    expect(screen.getByText(/rank is by time alone/i)).toBeInTheDocument()
    expect(screen.getByText(/equal times share a rank/i)).toBeInTheDocument()
  })

  it("explains what claiming buys, since the board shows a mark for it", () => {
    render(<RulesPage />)
    expect(screen.getByText(/claiming your entry with x is optional/i)).toBeInTheDocument()
  })

  it("says a guest entry can be claimed later, which is not obvious", () => {
    // Someone who ranked as a guest has to be told the entry is still theirs to
    // take, or the only way they find out is by trying.
    render(<RulesPage />)
    expect(
      screen.getByText(/only a claimed handle can post a faster time later/i),
    ).toBeInTheDocument()
  })

  it("states the tie-break, which decides who is seen first", () => {
    // Two entries at the same second is the normal case, so which of them is
    // listed above the other is a rule people will notice and ask about.
    render(<RulesPage />)
    expect(screen.getByText(/a claimed entry is listed first/i)).toBeInTheDocument()
  })

  it("explains the headline number, which does not match rank 1", () => {
    // The hero shows the fastest *claimed* time while an unclaimed entry can
    // hold rank 1 — two different numbers on one screen, unexplained.
    render(<RulesPage />)
    expect(screen.getByText(/fastest claimed time/i)).toBeInTheDocument()
  })

  it("promises nothing the product cannot do", () => {
    // There is no edit screen. A faster time is posted by ranking again, and
    // the rules said "changed", which reads as an editor that does not exist.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/\bedit\b|\bchanged\b/i)
  })

  it("uses one word for the action, and keeps 'verified' for the state", () => {
    // "Verify your handle" and "claim your entry" were the same operation
    // under two names. The action is claiming; the badge is what it earns.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/verify|verifying/i)
  })
})
