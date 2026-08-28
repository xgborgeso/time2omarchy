import { describe, expect, it } from "vitest"
import { benchmark, matchesSpec, median } from "@/lib/benchmark"

const row = (timeSeconds: number, cpuId: string, ramGb: number, storage: string) => ({
  timeSeconds,
  cpuId,
  ramGb,
  storage,
})

describe("median", () => {
  it("takes the middle of an odd count", () => {
    expect(median([10, 20, 90])).toBe(20)
  })

  it("averages the two middles of an even count", () => {
    expect(median([10, 20, 30, 90])).toBe(25)
  })

  it("is unmoved by an outlier, which is why it is not the mean", () => {
    // One 900s entry on a broken machine should not make the board look slow.
    expect(median([30, 31, 32, 900])).toBe(31.5)
    expect(median([])).toBeNull()
  })
})

describe("benchmark", () => {
  const rows = [
    row(30, "amd-ryzen-7-9800x3d", 32, "nvme"),
    row(40, "amd-ryzen-9-9950x", 64, "nvme"),
    row(200, "intel-core-i7-1260p", 16, "hdd"),
    row(300, "other", 8, "hdd"),
  ]

  it("groups install times by the drive, the biggest single factor", () => {
    const drives = benchmark(rows).storage
    const nvme = drives.find((b) => b.id === "nvme")

    expect(nvme?.entries).toBe(2)
    expect(nvme?.medianSeconds).toBe(35)
    expect(nvme?.fastestSeconds).toBe(30)
  })

  it("groups by CPU vendor, which is what people actually argue about", () => {
    const vendors = benchmark(rows).vendor
    expect(vendors.find((b) => b.id === "AMD")?.entries).toBe(2)
    expect(vendors.find((b) => b.id === "Intel")?.entries).toBe(1)
  })

  it("names the bucket a chip outside the catalogue falls into", () => {
    // "other" is a real answer people pick, and dropping it would quietly
    // shrink the sample the rest of the table is measured against.
    expect(benchmark(rows).vendor.find((b) => b.id === "Other")?.entries).toBe(1)
  })

  it("groups by memory too, so all three specs are answerable", () => {
    expect(benchmark(rows).ram.find((b) => b.id === "32")?.entries).toBe(1)
  })

  it("orders every table fastest first, since that is the question", () => {
    for (const buckets of Object.values(benchmark(rows))) {
      const medians = buckets.map((b) => b.medianSeconds)
      expect(medians).toEqual([...medians].sort((a, b) => a - b))
    }
  })

  it("returns empty tables for an empty board rather than throwing", () => {
    expect(benchmark([])).toEqual({ storage: [], vendor: [], ram: [] })
  })
})

describe("matchesSpec", () => {
  const amd = row(30, "amd-ryzen-7-9800x3d", 32, "nvme")

  it("matches a drive by its id", () => {
    expect(matchesSpec(amd, { dimension: "storage", id: "nvme" })).toBe(true)
    expect(matchesSpec(amd, { dimension: "storage", id: "hdd" })).toBe(false)
  })

  it("matches a vendor, which is not a column but a fact about the chip", () => {
    expect(matchesSpec(amd, { dimension: "vendor", id: "AMD" })).toBe(true)
    expect(matchesSpec(amd, { dimension: "vendor", id: "Intel" })).toBe(false)
  })

  it("matches memory by size, compared as the label writes it", () => {
    expect(matchesSpec(amd, { dimension: "ram", id: "32" })).toBe(true)
    expect(matchesSpec(amd, { dimension: "ram", id: "16" })).toBe(false)
  })
})
