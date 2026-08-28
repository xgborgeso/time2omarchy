import { render, screen } from "@testing-library/react"
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
  cpu: [
    { id: "AMD", label: "AMD", entries: 60, fastestSeconds: 26, medianSeconds: 40 },
    { id: "Intel", label: "Intel", entries: 40, fastestSeconds: 30, medianSeconds: 52 },
  ],
  cpuLevel: "vendor",
  cpuParent: null,
  ram: [{ id: "32", label: "32 GB", entries: 50, fastestSeconds: 26, medianSeconds: 44 }],
}

describe("Hardware", () => {
  it("gives every spec its own chart", () => {
    render(<Hardware hardware={hardware} onFilter={() => {}} active={null} />)
    expect(screen.getByText("By drive")).toBeVisible()
    expect(screen.getByText("By CPU")).toBeVisible()
    expect(screen.getByText("By memory")).toBeVisible()
  })

  it("warns where a sample is too small to mean anything", () => {
    // Three HDD installs is an anecdote. Drawing it identically to eighty
    // NVMe ones is the difference between data and a claim.
    render(<Hardware hardware={hardware} onFilter={() => {}} active={null} />)
    expect(screen.getByText(/faded bars have under 10 installs/i)).toBeVisible()
  })

  it("says nothing about samples when every bucket is big enough", () => {
    render(
      <Hardware
        hardware={{ ...hardware, storage: [hardware.storage[0]!] }}
        onFilter={() => {}}
        active={null}
      />,
    )
    expect(screen.queryByText(/faded bars/i)).toBeNull()
  })

  it("narrows the page from a control that can be reached by keyboard", async () => {
    // The filter used to be the chart bars themselves. A <path> cannot be
    // tabbed to, and this is the main control on the page.
    const onFilter = vi.fn()
    const user = userEvent.setup()
    render(<Hardware hardware={hardware} onFilter={onFilter} active={null} />)

    await user.click(screen.getByRole("combobox", { name: /narrow the stats/i }))
    await user.click(screen.getByRole("option", { name: "SATA SSD" }))

    expect(onFilter).toHaveBeenCalledWith({ dimension: "storage", id: "ssd" })
  })

  it("clears the filter through the same control", async () => {
    const onFilter = vi.fn()
    const user = userEvent.setup()
    render(
      <Hardware
        hardware={hardware}
        onFilter={onFilter}
        active={{ dimension: "vendor", id: "AMD" }}
      />,
    )

    await user.click(screen.getByRole("combobox", { name: /narrow the stats/i }))
    await user.click(screen.getByRole("option", { name: "All installs" }))

    expect(onFilter).toHaveBeenCalledWith(null)
  })

  it("keeps naming the chosen bucket after drilling past it", async () => {
    // Choosing AMD swaps the CPU chart to AMD's families, so no item in the
    // list carries the value "vendor:AMD" any more. Left to resolve the label
    // itself, the trigger rendered empty.
    render(
      <Hardware
        hardware={{
          ...hardware,
          cpu: [
            {
              id: "Ryzen 9000",
              label: "Ryzen 9000",
              entries: 28,
              fastestSeconds: 26,
              medianSeconds: 34,
            },
          ],
          cpuLevel: "family",
          cpuParent: { dimension: "vendor", id: "AMD", label: "AMD" },
        }}
        onFilter={() => {}}
        active={{ dimension: "vendor", id: "AMD" }}
      />,
    )
    expect(screen.getByRole("combobox", { name: /narrow the stats/i })).toHaveTextContent(
      "AMD",
    )
  })

  it("names the chosen bucket when it is still in the list", async () => {
    render(
      <Hardware
        hardware={hardware}
        onFilter={() => {}}
        active={{ dimension: "storage", id: "ssd" }}
      />,
    )
    expect(screen.getByRole("combobox", { name: /narrow the stats/i })).toHaveTextContent(
      "SATA SSD",
    )
  })

  it("says nothing at all when there is nothing measured yet", () => {
    const { container } = render(
      <Hardware
        hardware={{ storage: [], cpu: [], cpuLevel: "vendor", cpuParent: null, ram: [] }}
        onFilter={() => {}}
        active={null}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
