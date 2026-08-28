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
    const vendors = benchmark(rows).cpu
    expect(vendors.find((b) => b.id === "AMD")?.entries).toBe(2)
    expect(vendors.find((b) => b.id === "Intel")?.entries).toBe(1)
  })

  it("names the bucket a chip outside the catalogue falls into", () => {
    // "other" is a real answer people pick, and dropping it would quietly
    // shrink the sample the rest of the table is measured against.
    expect(benchmark(rows).cpu.find((b) => b.id === "Other")?.entries).toBe(1)
  })

  it("groups by memory too, so all three specs are answerable", () => {
    expect(benchmark(rows).ram.find((b) => b.id === "32")?.entries).toBe(1)
  })

  it("orders every chart fastest first, since that is the question", () => {
    const { storage, cpu, ram } = benchmark(rows)
    for (const buckets of [storage, cpu, ram]) {
      const medians = buckets.map((b) => b.medianSeconds)
      expect(medians).toEqual([...medians].sort((a, b) => a - b))
    }
  })

  it("returns empty charts for an empty board rather than throwing", () => {
    expect(benchmark([])).toEqual({
      storage: [],
      cpu: [],
      cpuLevel: "vendor",
      cpuParent: null,
      ram: [],
    })
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

describe("drilling into the CPU", () => {
  const rows = [
    row(30, "amd-ryzen-7-9800x3d", 32, "nvme"),
    row(40, "amd-ryzen-9-9950x", 64, "nvme"),
    row(50, "amd-ryzen-7-7800x3d", 32, "nvme"),
    row(70, "intel-core-i9-14900k", 32, "nvme"),
  ]

  it("starts at the vendor, which is the readable overview", () => {
    const b = benchmark(rows)
    expect(b.cpuLevel).toBe("vendor")
    expect(b.cpu.map((c) => c.id)).toEqual(["AMD", "Intel"])
    expect(b.cpuParent).toBeNull()
  })

  it("shows one vendor's families once that vendor is chosen", () => {
    // 41 families in one chart is unreadable; a vendor's dozen is not.
    const b = benchmark(rows, { dimension: "vendor", id: "AMD" })

    expect(b.cpuLevel).toBe("family")
    expect(b.cpu.map((c) => c.id).sort()).toEqual(["Ryzen 7000", "Ryzen 9000"])
    expect(b.cpuParent).toEqual({ dimension: "vendor", id: "AMD", label: "AMD" })
  })

  it("measures a family over its own installs, not the whole board", () => {
    const b = benchmark(rows, { dimension: "vendor", id: "AMD" })
    const zen5 = b.cpu.find((c) => c.id === "Ryzen 9000")

    expect(zen5?.entries).toBe(2)
    expect(zen5?.medianSeconds).toBe(35)
  })

  it("shows the models inside a family once that family is chosen", () => {
    const b = benchmark(rows, { dimension: "family", id: "Ryzen 9000" })

    expect(b.cpuLevel).toBe("model")
    expect(b.cpu.map((c) => c.label)).toEqual(["Ryzen 7 9800X3D", "Ryzen 9 9950X"])
    expect(b.cpuParent?.id).toBe("AMD")
  })

  it("keeps a chosen model beside its siblings, not alone", () => {
    // A chart with one bar compares nothing. Staying at the family level is
    // what makes choosing a model useful.
    const b = benchmark(rows, { dimension: "model", id: "amd-ryzen-9-9950x" })

    expect(b.cpuLevel).toBe("model")
    expect(b.cpu.map((c) => c.id)).toContain("amd-ryzen-7-9800x3d")
  })

  it("stays put when a vendor has no level below it", () => {
    // "Other" is every chip outside the catalogue, so it has no families and
    // no models. Drilling in produced an empty chart and the card vanished,
    // taking the only way back with it.
    const mixed = [...rows, row(400, "other", 8, "hdd")]
    const b = benchmark(mixed, { dimension: "vendor", id: "Other" })

    expect(b.cpuLevel).toBe("vendor")
    expect(b.cpuParent).toBeNull()
    expect(b.cpu.map((c) => c.id)).toContain("Other")
  })

  it("stays at the vendor when the filter is not about CPUs at all", () => {
    expect(benchmark(rows, { dimension: "storage", id: "nvme" }).cpuLevel).toBe("vendor")
  })

  it("measures drives and memory over the whole board regardless of the drill", () => {
    // Narrowing every chart to the current filter would hide the bar you need
    // in order to change your mind.
    const b = benchmark(rows, { dimension: "vendor", id: "AMD" })
    expect(b.storage.find((s) => s.id === "nvme")?.entries).toBe(4)
  })
})
