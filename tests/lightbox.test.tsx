import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Lightbox } from "@/components/Lightbox"
import type { BoardEntry } from "@/lib/types"

const entry: BoardEntry = {
  rank: 1,
  handle: "ada",
  timeSeconds: 64,
  bootScreenUrl: "/uploads/ada.png",
  cpuId: "intel-core-i7-13700k",
  ramGb: 32,
  storage: "nvme",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("Lightbox", () => {
  it("stays shut when there is nothing to show", () => {
    render(<Lightbox entry={null} onClose={() => {}} />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens on an entry and names it for screen readers", () => {
    render(<Lightbox entry={entry} onClose={() => {}} />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Boot screen for @ada")).toBeInTheDocument()
  })

  it("describes the run in the time format the board uses", () => {
    // Nothing is drawn for sighted users, so the description is the only
    // place the run is named at all — and it says 1:04, never 64s.
    render(<Lightbox entry={entry} onClose={() => {}} />)
    expect(screen.getByText(/1:04/)).toBeInTheDocument()
    expect(screen.queryByText(/64s/)).toBeNull()
  })

  it("draws nothing the row behind it is already showing", () => {
    // The dialog is one image. Time, rank, handle, specs and the verified
    // mark are all on the entry that was clicked to open it, still on screen
    // behind the overlay, so a caption here was the same record twice.
    render(<Lightbox entry={entry} onClose={() => {}} />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByText("Intel Core i7-13700K · 32GB · NVMe")).toBeNull()
    expect(screen.queryByText("#1")).toBeNull()
    expect(screen.getByRole("img", { name: "Boot screen for @ada" })).toBeInTheDocument()
  })

  it("closes on Escape", async () => {
    // Radix owns this, but it is the only way out on a touch device.
    const onClose = vi.fn()
    render(<Lightbox entry={entry} onClose={onClose} />)
    await userEvent.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalled()
  })
})
