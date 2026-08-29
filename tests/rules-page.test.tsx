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

  it("says ranking goes through X, which is the rule people meet first", () => {
    render(<RulesPage />)
    expect(screen.getByText(/ranking goes through x/i)).toBeInTheDocument()
  })

  it("says the entry is yours to improve, and only yours", () => {
    // The one thing an account buys, now that it is required rather than
    // earned: nobody else can touch the row it names.
    render(<RulesPage />)
    expect(screen.getByText(/only you can change your entry/i)).toBeInTheDocument()
  })

  it("states the tie-break, which decides who is seen first", () => {
    // Two entries at the same second is the normal case, so which of them is
    // listed above the other is a rule people will notice and ask about.
    render(<RulesPage />)
    expect(screen.getByText(/the earlier entry is listed first/i)).toBeInTheDocument()
  })

  it("promises nothing the product cannot do", () => {
    // There is no edit screen. A faster time is posted by ranking again, and
    // the rules said "changed", which reads as an editor that does not exist.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/\bedit\b|\bchanged\b/i)
  })

  it("has no vocabulary left for a thing that no longer exists", () => {
    // Claiming and verifying were both ways of attaching an account to an
    // entry after the fact. Ranking goes through X, so neither is a step
    // anyone takes, and a rule describing one would describe nothing.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/\bclaim|verif/i)
  })
})
