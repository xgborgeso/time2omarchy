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
  cpuUnlisted: 0,
  ram: [{ id: "32", label: "32 GB", entries: 50, fastestSeconds: 26, medianSeconds: 44 }],
}

describe("Hardware", () => {
  it("gives every spec its own chart", () => {
    render(<Hardware hardware={hardware} onFilter={() => {}} active={null} />)
    expect(screen.getByText("By drive")).toBeVisible()
    expect(screen.getByText("By CPU")).toBeVisible()
    expect(screen.getByText("By memory")).toBeVisible()
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
        hardware={{
          storage: [],
          cpu: [],
          cpuLevel: "vendor",
          cpuParent: null,
          cpuUnlisted: 0,
          ram: [],
        }}
        onFilter={() => {}}
        active={null}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

/** The same board, one level into AMD. */
const drilled: Benchmark = {
  ...hardware,
  cpu: [
    {
      id: "Ryzen 9000",
      label: "Ryzen 9000",
      entries: 30,
      fastestSeconds: 26,
      medianSeconds: 40,
    },
  ],
  cpuLevel: "family",
  cpuParent: { dimension: "vendor", id: "AMD", label: "AMD" },
}

describe("drilling back out of a CPU", () => {
  it("offers the way back only where there is one to offer", () => {
    // Only the CPU card can be a level deep, so only it gets the button.
    render(<Hardware hardware={drilled} active={null} onFilter={() => {}} />)
    expect(screen.getAllByRole("button", { name: /all cpus/i })).toHaveLength(1)
  })

  it("titles the card after where the drill landed", () => {
    render(<Hardware hardware={drilled} active={null} onFilter={() => {}} />)
    expect(screen.getByText("AMD")).toBeVisible()
  })

  it("clears the filter when the way back is taken", async () => {
    // An empty chart would otherwise take the only route out with it.
    const onFilter = vi.fn()
    render(<Hardware hardware={drilled} active={null} onFilter={onFilter} />)

    await userEvent.setup().click(screen.getByRole("button", { name: /all cpus/i }))
    expect(onFilter).toHaveBeenCalledWith(null)
  })

  it("says how many installs the CPU chart could not place", () => {
    // A chart measuring fewer installs than the board holds has to admit it.
    render(
      <Hardware
        hardware={{ ...hardware, cpuUnlisted: 11 }}
        active={null}
        onFilter={() => {}}
      />,
    )
    expect(
      screen.getByText(/11 installs on a chip that is not in the list yet/i),
    ).toBeVisible()
  })

  it("stays quiet when every chip is accounted for", () => {
    render(<Hardware hardware={hardware} active={null} onFilter={() => {}} />)
    expect(screen.queryByText(/not in the list yet/i)).toBeNull()
  })
})

describe("naming a filter nothing on screen still carries", () => {
  it("falls back to the bucket id when no chart and no breadcrumb has it", async () => {
    // Drilling swaps the CPU group for the level below, so the item holding
    // the current value can be gone from the list entirely — and Radix then
    // has no label to resolve, which is what left the trigger blank.
    render(
      <Hardware
        hardware={{ ...hardware, cpu: [], cpuParent: null }}
        active={{ dimension: "model", id: "amd-ryzen-9-9950x" }}
        onFilter={() => {}}
      />,
    )
    expect(screen.getByText("amd-ryzen-9-9950x")).toBeVisible()
  })
})

describe("counting the installs the CPU chart cannot place", () => {
  it("says install, not installs, when there is exactly one", () => {
    render(
      <Hardware
        hardware={{ ...hardware, cpuUnlisted: 1 }}
        active={null}
        onFilter={() => {}}
      />,
    )
    expect(screen.getByText(/1 install on a chip/i)).toBeVisible()
  })
})
