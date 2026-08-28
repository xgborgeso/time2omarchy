import { describe, expect, it } from "vitest"
import { formatSpecs, RAM_OPTIONS, STORAGE, specsSchema, storageLabel } from "@/lib/specs"

describe("specsSchema", () => {
  it("accepts an entry with no specs at all", () => {
    // Specs are optional; requiring them would gate ranking, which nothing does.
    expect(specsSchema.safeParse({}).success).toBe(true)
  })

  it("accepts a complete, valid set", () => {
    const r = specsSchema.safeParse({
      cpuId: "intel-core-i7-13700k",
      ramGb: 32,
      storage: "nvme",
    })
    expect(r.success).toBe(true)
  })

  it("accepts a partial set, since people know some of their machine", () => {
    expect(specsSchema.safeParse({ storage: "nvme" }).success).toBe(true)
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
  it("reads as cpu, memory, disk", () => {
    expect(formatSpecs({ cpuId: "intel-core-i7-13700k", ramGb: 32, storage: "nvme" })).toBe(
      "Intel Core i7-13700K · 32GB · NVMe SSD",
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
