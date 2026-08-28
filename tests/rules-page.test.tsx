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

  it("explains what verifying buys, since the board shows a mark for it", () => {
    render(<RulesPage />)
    expect(screen.getByText(/verifying your entry with x is optional/i)).toBeInTheDocument()
  })

  it("says a guest entry can be verified later, which is not obvious", () => {
    // Someone who ranked as a guest has to be told the entry is still theirs to
    // take, or the only way they find out is by trying.
    render(<RulesPage />)
    expect(
      screen.getByText(/only a verified handle can post a faster time later/i),
    ).toBeInTheDocument()
  })

  it("states the tie-break, which decides who is seen first", () => {
    // Two entries at the same second is the normal case, so which of them is
    // listed above the other is a rule people will notice and ask about.
    render(<RulesPage />)
    expect(screen.getByText(/a verified entry is listed first/i)).toBeInTheDocument()
  })

  it("explains the headline number, which does not match rank 1", () => {
    // The hero shows the fastest *verified* time while an unverified entry can
    // hold rank 1 — two different numbers on one screen, unexplained.
    render(<RulesPage />)
    expect(screen.getByText(/fastest verified time/i)).toBeInTheDocument()
  })

  it("promises nothing the product cannot do", () => {
    // There is no edit screen. A faster time is posted by ranking again, and
    // the rules said "changed", which reads as an editor that does not exist.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/\bedit\b|\bchanged\b/i)
  })

  it("uses one word for the action and the state alike", () => {
    // Verb and badge now share a root: you verify an entry, and it is
    // verified. "Claim" was a second word for the same operation.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/\bclaim/i)
    expect(rules.join(" ")).toMatch(/verif/i)
  })
})
