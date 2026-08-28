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

  it("explains the mark to sighted users, not only to screen readers", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(entryFor("ada")).getByLabelText("Handle verified on X")).toHaveAttribute(
      "title",
      expect.stringContaining("Verified on X"),
    )
  })

  it("marks only the verified handle", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(
      within(entryFor("ada")).getByLabelText("Handle verified on X"),
    ).toBeInTheDocument()
    expect(within(entryFor("grace")).queryByLabelText("Handle verified on X")).toBeNull()
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
  it("offers a claim on an unverified entry to the account that owns it", async () => {
    // Ranked as a guest, signed in later: the row is right there, so the
    // offer belongs on the row rather than only in the form above.
    const onClaim = vi.fn()
    const user = userEvent.setup()
    render(
      <Board
        entries={TIED}
        loading={false}
        onOpen={() => {}}
        signedInHandle="grace"
        onClaim={onClaim}
      />,
    )
    await user.click(within(entryFor("grace")).getByRole("button", { name: /claim/i }))

    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({ handle: "grace" }))
  })

  it("never offers a claim on someone else's entry", async () => {
    render(
      <Board
        entries={TIED}
        loading={false}
        onOpen={() => {}}
        signedInHandle="grace"
        onClaim={() => {}}
      />,
    )
    expect(within(entryFor("linus")).queryByRole("button", { name: /claim/i })).toBeNull()
  })

  it("never offers a claim on an entry that is already verified", async () => {
    render(
      <Board
        entries={[entry({ handle: "ada", rank: 1, verified: true })]}
        loading={false}
        onOpen={() => {}}
        signedInHandle="ada"
        onClaim={() => {}}
      />,
    )
    expect(within(entryFor("ada")).queryByRole("button", { name: /claim/i })).toBeNull()
  })

  it("offers a claim to a signed-out visitor, who may be the owner", async () => {
    // Signed out we cannot know whose row this is, and the person who ranked
    // as a guest has no other way back in from here.
    render(<Board entries={TIED} loading={false} onOpen={() => {}} onClaim={() => {}} />)
    expect(within(entryFor("grace")).getByRole("button", { name: /claim/i })).toBeVisible()
    expect(within(entryFor("ada")).queryByRole("button", { name: /claim/i })).toBeNull()
  })
})
