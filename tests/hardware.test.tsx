import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Hardware } from "@/components/stats/Hardware"
import type { Benchmark } from "@/lib/benchmark"

const hardware: Benchmark = {
  storage: [
    { id: "nvme", label: "NVMe", entries: 80, fastestSeconds: 26, medianSeconds: 41 },
    { id: "ssd", label: "SATA SSD", entries: 25, fastestSeconds: 38, medianSeconds: 68 },
    { id: "hdd", label: "HDD", entries: 3, fastestSeconds: 180, medianSeconds: 240 },
  ],
  vendor: [
    { id: "AMD", label: "AMD", entries: 60, fastestSeconds: 26, medianSeconds: 40 },
    { id: "Intel", label: "Intel", entries: 40, fastestSeconds: 30, medianSeconds: 52 },
  ],
  ram: [{ id: "32", label: "32 GB", entries: 50, fastestSeconds: 26, medianSeconds: 44 }],
}

describe("Hardware", () => {
  it("answers what an install costs on each kind of drive", () => {
    render(<Hardware hardware={hardware} onFilter={() => {}} active={null} />)
    const row = screen.getByTestId("bucket-storage-hdd")
    expect(row).toHaveTextContent("HDD")
    expect(row).toHaveTextContent("4:00")
    expect(row).toHaveTextContent("3")
  })

  it("warns where the sample is too small to mean anything", () => {
    // Three HDD installs is an anecdote. Presenting it beside eighty NVMe
    // ones without saying so is the difference between data and a claim.
    render(<Hardware hardware={hardware} onFilter={() => {}} active={null} />)
    expect(
      within(screen.getByTestId("bucket-storage-hdd")).getByTitle(/too few/i),
    ).toBeVisible()
    expect(
      within(screen.getByTestId("bucket-storage-nvme")).queryByTitle(/too few/i),
    ).toBeNull()
  })

  it("filters the page when a bucket is chosen", async () => {
    const onFilter = vi.fn()
    const user = userEvent.setup()
    render(<Hardware hardware={hardware} onFilter={onFilter} active={null} />)
    await user.click(screen.getByTestId("bucket-vendor-AMD"))

    expect(onFilter).toHaveBeenCalledWith({ dimension: "vendor", id: "AMD" })
  })

  it("clears the filter when the chosen bucket is chosen again", async () => {
    const onFilter = vi.fn()
    const user = userEvent.setup()
    render(
      <Hardware
        hardware={hardware}
        onFilter={onFilter}
        active={{ dimension: "vendor", id: "AMD" }}
      />,
    )
    await user.click(screen.getByTestId("bucket-vendor-AMD"))

    expect(onFilter).toHaveBeenCalledWith(null)
  })

  it("says nothing at all when there is nothing measured yet", () => {
    const { container } = render(
      <Hardware
        hardware={{ storage: [], vendor: [], ram: [] }}
        onFilter={() => {}}
        active={null}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
