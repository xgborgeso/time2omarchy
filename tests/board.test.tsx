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
    cpuId: null,
    ramGb: null,
    storage: null,
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

function rowFor(handle: string): HTMLElement {
  // The handle sits in a span inside the row div, so the nearest div is the row.
  const row = screen.getByRole("link", { name: `@${handle}` }).closest("div")
  if (!row) throw new Error(`no row for @${handle}`)
  return row
}

describe("Board", () => {
  it("shows the same rank on both halves of a tie", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(rowFor("ada")).getByText("#1")).toBeInTheDocument()
    expect(within(rowFor("grace")).getByText("#1")).toBeInTheDocument()
  })

  it("leaves no gap in the rank after a tie", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(rowFor("linus")).getByText("#2")).toBeInTheDocument()
    expect(screen.queryByText("#3")).not.toBeInTheDocument()
  })

  it("explains the mark to sighted users, not only to screen readers", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(rowFor("ada")).getByLabelText("Handle verified on X")).toHaveAttribute(
      "title",
      expect.stringContaining("Verified on X"),
    )
  })

  it("marks only the verified handle", () => {
    render(<Board entries={TIED} loading={false} onOpen={() => {}} />)
    expect(within(rowFor("ada")).getByLabelText("Handle verified on X")).toBeInTheDocument()
    expect(within(rowFor("grace")).queryByLabelText("Handle verified on X")).toBeNull()
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
