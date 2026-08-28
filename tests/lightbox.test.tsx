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
  verified: true,
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

  it("shows the formatted time in both the caption and the description", () => {
    // Sighted users read the caption; screen readers get the description.
    render(<Lightbox entry={entry} onClose={() => {}} />)
    expect(screen.getAllByText(/1:04/).length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/64s/)).toBeNull()
  })

  it("shows the hardware when the ranker gave it", () => {
    render(<Lightbox entry={entry} onClose={() => {}} />)
    expect(screen.getByText("Intel Core i7-13700K · 32GB · NVMe")).toBeInTheDocument()
  })

  it("names the not-listed bucket rather than showing a gap", () => {
    // Specs are required, but the catalogue can still miss a chip.
    render(<Lightbox entry={{ ...entry, cpuId: "other" }} onClose={() => {}} />)
    expect(screen.getByText("Other CPU · 32GB · NVMe")).toBeInTheDocument()
  })

  it("closes on Escape", async () => {
    // Radix owns this, but it is the only way out on a touch device.
    const onClose = vi.fn()
    render(<Lightbox entry={entry} onClose={onClose} />)
    await userEvent.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalled()
  })
})
