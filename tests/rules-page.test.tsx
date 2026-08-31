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

  it("asks for a screenshot rather than a boot screen specifically", () => {
    // A terminal shot of the install log is accepted, so a rule demanding a
    // boot screen now describes something narrower than what the form takes.
    render(<RulesPage />)
    expect(screen.getByText(/a screenshot is required/i)).toBeInTheDocument()
  })

  it("names the log in the rule about what you upload", () => {
    // Recovering a time answers "what do I upload?". It is one clause on the
    // rule that asks for the screenshot, not a rule of its own.
    render(<RulesPage />)
    const upload = screen
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "")
      .find((r) => /a screenshot is required/i.test(r))
    expect(upload).toContain("/var/log/omarchy-install-timing.json")
  })

  it("ends on how to take part rather than on being reported", () => {
    // The last rule was "anyone can report one that does not look right",
    // which was the last thing read before the button — a warning where an
    // invitation belongs. Reporting is still there; it lives on the lightbox,
    // beside the entry it is about, which is the only place it can be used.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/self-reported|report one|does not look right/i)
  })

  it("does not promise the log is better proof than a photo", () => {
    // It is a text file. Editing it is easier than editing an image, and
    // claiming otherwise would be selling a guarantee the board cannot keep.
    render(<RulesPage />)
    const rules = screen.getAllByRole("listitem").map((li) => li.textContent ?? "")
    expect(rules.join(" ")).not.toMatch(/proof|proves|guarantee|tamper/i)
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
