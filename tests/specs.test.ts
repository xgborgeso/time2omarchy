import { describe, expect, it } from "vitest"
import {
  formatSpecs,
  formatSpecsShort,
  OTHER_CPU_ID,
  RAM_OPTIONS,
  STORAGE,
  specsSchema,
  storageLabel,
} from "@/lib/specs"

describe("specsSchema", () => {
  it("accepts a complete set", () => {
    const r = specsSchema.safeParse({
      cpuId: "intel-core-i7-13700k",
      ramGb: 32,
      storage: "nvme",
    })
    expect(r.success).toBe(true)
  })

  it("requires all three, because partial data makes the stats lie", () => {
    expect(specsSchema.safeParse({}).success).toBe(false)
    expect(specsSchema.safeParse({ storage: "nvme" }).success).toBe(false)
    expect(specsSchema.safeParse({ cpuId: "apple-m4-max", ramGb: 32 }).success).toBe(false)
  })

  it("accepts the not-listed sentinel, so an unlisted chip cannot block a rank", () => {
    // The catalogue can never be complete. Requiring an answer is fine;
    // requiring a *listed* answer would lock people out entirely.
    const r = specsSchema.safeParse({ cpuId: OTHER_CPU_ID, ramGb: 32, storage: "nvme" })
    expect(r.success).toBe(true)
  })

  it("refuses a cpu that is not in the catalogue", () => {
    // Free text is what makes stats unaggregatable, so the id must be known.
    expect(specsSchema.safeParse({ cpuId: "intel-pentium-ii" }).success).toBe(false)
  })

  it("refuses a ram size that is not an offered option", () => {
    expect(specsSchema.safeParse({ ramGb: 13 }).success).toBe(false)
    expect(specsSchema.safeParse({ ramGb: -8 }).success).toBe(false)
  })

  it("refuses an unknown storage kind", () => {
    expect(specsSchema.safeParse({ storage: "floppy" }).success).toBe(false)
  })
})

describe("formatSpecs", () => {
  it("names the not-listed bucket rather than leaving a gap", () => {
    expect(formatSpecs({ cpuId: OTHER_CPU_ID, ramGb: 16, storage: "ssd" })).toBe(
      "Other CPU · 16GB · SATA SSD",
    )
  })

  it("reads as cpu, memory, disk", () => {
    expect(formatSpecs({ cpuId: "intel-core-i7-13700k", ramGb: 32, storage: "nvme" })).toBe(
      "Intel Core i7-13700K · 32GB · NVMe",
    )
  })

  it("omits the parts that were not given", () => {
    expect(formatSpecs({ cpuId: null, ramGb: 32, storage: null })).toBe("32GB")
  })

  it("returns null when nothing was given, so callers can skip the row", () => {
    expect(formatSpecs({ cpuId: null, ramGb: null, storage: null })).toBeNull()
  })

  it("ignores a cpu id that has since left the catalogue", () => {
    // An id could be removed by a bad PR; a stored entry must still render.
    expect(formatSpecs({ cpuId: "gone", ramGb: 16, storage: null })).toBe("16GB")
  })
})

describe("options", () => {
  it("offers ram sizes in ascending order", () => {
    expect([...RAM_OPTIONS]).toEqual([...RAM_OPTIONS].sort((a, b) => a - b))
  })

  it("labels every storage kind it accepts", () => {
    for (const kind of STORAGE) {
      expect(storageLabel(kind.id)).toBe(kind.label)
    }
  })
})

describe("formatSpecsShort", () => {
  it("keeps the disk, which decides the time as much as the chip does", () => {
    // Dropping it made two entries look like the same machine when one
    // installed to NVMe and the other to a spinning disk.
    expect(
      formatSpecsShort({ cpuId: "intel-core-i7-13700k", ramGb: 32, storage: "nvme" }),
    ).toBe("Core i7-13700K · 32GB · NVMe")
  })

  it("still drops the vendor, which a board row has no width for", () => {
    expect(
      formatSpecsShort({ cpuId: "intel-core-i7-13700k", ramGb: 32, storage: "hdd" }),
    ).not.toContain("Intel")
  })

  it("falls back to whichever part was given", () => {
    expect(formatSpecsShort({ cpuId: "apple-m4-max", ramGb: null, storage: null })).toBe(
      "M4 Max",
    )
    expect(formatSpecsShort({ cpuId: null, ramGb: 16, storage: null })).toBe("16GB")
  })

  it("returns null when there is nothing to show", () => {
    expect(formatSpecsShort({ cpuId: null, ramGb: null, storage: null })).toBeNull()
  })
})
