import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Board } from "@/components/Board"
import type { BoardEntry } from "@/lib/types"

function entry(
  over: Partial<BoardEntry> & Pick<BoardEntry, "handle" | "rank">,
): BoardEntry {
  return {
    timeSeconds: 43,
    bootScreenUrl: "/uploads/x.png",
    verified: false,
    cpuId: "other",
    ramGb: 16,
    storage: "ssd",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }
}

/** Mirrors what the server produces for a tie: shared rank, verified first. */
const TIED: BoardEntry[] = [
  entry({ handle: "ada", rank: 1, verified: true }),
  entry({ handle: "grace", rank: 1 }),
  entry({ handle: "linus", rank: 2, timeSeconds: 51 }),
]

function entryFor(handle: string): HTMLElement {
  // The handle sits in a span inside the row div, so the nearest div is the row.
  const row = screen.getByRole("link", { name: `@${handle}` }).closest("div")
  if (!row) throw new Error(`no row for @${handle}`)
  return row
}

describe("Board", () => {
  it("shows the same rank on both halves of a tie", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(entryFor("ada")).getByText("#1")).toBeInTheDocument()
    expect(within(entryFor("grace")).getByText("#1")).toBeInTheDocument()
  })

  it("leaves no gap in the rank after a tie", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(entryFor("linus")).getByText("#2")).toBeInTheDocument()
    expect(screen.queryByText("#3")).not.toBeInTheDocument()
  })

  it("says what the mark means rather than leaving a bare icon", () => {
    // The check used to carry its meaning only in an aria-label, which a
    // sighted reader never sees. The badge says the word.
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    const badge = within(entryFor("ada")).getByText("Verified")
    expect(badge).toBeVisible()
    expect(badge).toHaveAttribute("title", expect.stringContaining("Verified on X"))
  })

  it("marks only the verified handle", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(entryFor("ada")).getByText("Verified")).toBeInTheDocument()
    expect(within(entryFor("grace")).queryByText("Verified")).toBeNull()
  })

  it("shows the hardware on a row that has it", () => {
    render(
      <Board
        entries={[entry({ handle: "ada", rank: 1, cpuId: "apple-m4-max", ramGb: 32 })]}
        loading={false}
        onOpen={() => {}}
      />,
    )
    // Short form drops the vendor, but keeps the disk: on a board that
    // measures install time, NVMe versus HDD explains most of the gap.
    expect(screen.getByText("M4 Max · 32GB · SATA SSD")).toBeInTheDocument()
  })

  it("names the not-listed bucket rather than showing a gap", () => {
    // Every entry has specs now, but the catalogue can miss a chip.
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(screen.getAllByText("Other CPU · 16GB · SATA SSD").length).toBe(TIED.length)
  })

  it("formats times rather than printing raw seconds", () => {
    render(
      <Board
        entries={[entry({ handle: "slow", rank: 1, timeSeconds: 64 })]}
        loading={false}
        onOpen={() => {}}
      />,
    )
    expect(screen.getByText("1:04")).toBeInTheDocument()
  })

  it("links a handle to its X profile", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(screen.getByRole("link", { name: "@ada" })).toHaveAttribute(
      "href",
      "https://x.com/ada",
    )
  })

  it("opens the boot screen for the row that was clicked", async () => {
    const onOpen = vi.fn()
    render(<Board entries={TIED} loading={false} onOpen={onOpen} />)
    await userEvent.click(
      screen.getByRole("button", { name: "Open boot screen for @grace" }),
    )
    expect(onOpen).toHaveBeenCalledWith(TIED[1])
  })

  it("renders nothing once loaded with an empty board", () => {
    const { container } = render(<Board entries={[]} loading={false} onOpen={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows placeholders while the first load is in flight", () => {
    const { container } = render(<Board entries={[]} loading={true} onOpen={() => {}} />)
    expect(container).not.toBeEmptyDOMElement()
    expect(screen.queryByRole("link")).toBeNull()
  })
})

describe("claiming from the board", () => {
  it("offers a claim on every unproven entry", async () => {
    // There is no logged-in state, so the board cannot know whose entry is
    // whose. Offering it everywhere is honest because the answer names the
    // mismatch — see the server's claim tests.
    const onClaim = vi.fn()
    const user = userEvent.setup()
    render(<Board entries={TIED} loading={false} onOpen={() => {}} onClaim={onClaim} />)
    await user.click(within(entryFor("grace")).getByRole("button", { name: /claim/i }))

    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({ handle: "grace" }))
  })

  it("never offers a claim on an entry that is already proven", async () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} onClaim={() => {}} />)
    expect(within(entryFor("ada")).queryByRole("button", { name: /claim/i })).toBeNull()
  })

  it("offers nothing at all when claiming is not wired up", async () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(screen.queryByRole("button", { name: /claim/i })).toBeNull()
  })
})

describe("an entry the board is not showing", () => {
  it("shows a found entry above the board, with its real rank", async () => {
    // At ten thousand entries the top 100 is not where most people are.
    render(
      <Board
        entries={TIED}
        loading={false}
        onOpen={() => {}}
        found={entry({ handle: "faraway", rank: 4207, timeSeconds: 300 })}
      />,
    )
    const found = screen.getByTestId("found-entry")
    expect(found).toHaveTextContent("@faraway")
    expect(found).toHaveTextContent("#4207")
  })

  it("shows nothing when there is nothing to show", async () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(screen.queryByTestId("found-entry")).toBeNull()
  })

  it("still offers a claim on a found entry that is unproven", async () => {
    const onClaim = vi.fn()
    const user = userEvent.setup()
    render(
      <Board
        entries={TIED}
        loading={false}
        onOpen={() => {}}
        onClaim={onClaim}
        found={entry({ handle: "faraway", rank: 4207 })}
      />,
    )
    await user.click(
      within(screen.getByTestId("found-entry")).getByRole("button", { name: /claim/i }),
    )
    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({ handle: "faraway" }))
  })
})
