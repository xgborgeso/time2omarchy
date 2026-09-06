import { describe, expect, it } from "vitest"
import {
  CPU_IDS,
  CPUS,
  cpuById,
  cpuLabel,
  cpusByVendor,
  normalizeCpuText,
  searchCpus,
} from "@/lib/cpus"

describe("the catalogue", () => {
  it("is not empty", () => {
    expect(CPUS.length).toBeGreaterThan(0)
  })

  // These guard the contribution surface: strangers open PRs against this
  // file, and CI should reject a bad one without anyone reading it closely.
  it("has no duplicate ids", () => {
    const ids = CPUS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has no duplicate names within a vendor", () => {
    const keys = CPUS.map((c) => `${c.vendor}/${c.name}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("uses lowercase kebab-case slugs so urls and ids stay stable", () => {
    for (const cpu of CPUS) {
      expect(cpu.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it("prefixes every id with its vendor, so ids sort into vendor groups", () => {
    for (const cpu of CPUS) {
      expect(cpu.id.startsWith(`${cpu.vendor.toLowerCase()}-`)).toBe(true)
    }
  })

  it("gives every entry a family, which is what stats group by", () => {
    for (const cpu of CPUS) {
      expect(cpu.family.trim().length).toBeGreaterThan(0)
    }
  })

  it("stays sorted by id, so contributions produce readable diffs", () => {
    const ids = CPUS.map((c) => c.id)
    expect(ids).toEqual([...ids].sort())
  })
})

describe("cpuById", () => {
  it("finds a known cpu", () => {
    const first = CPUS[0]!
    expect(cpuById(first.id)?.name).toBe(first.name)
  })

  it("returns null for anything not in the catalogue", () => {
    expect(cpuById("intel-pentium-ii")).toBeNull()
    expect(cpuById("")).toBeNull()
  })
})

describe("CPU_IDS", () => {
  it("covers the whole catalogue, since it is what validation accepts", () => {
    expect(CPU_IDS).toHaveLength(CPUS.length)
    expect(CPU_IDS).toContain(CPUS[0]!.id)
  })
})

describe("cpuLabel", () => {
  it("reads as vendor then model", () => {
    const cpu = CPUS[0]!
    expect(cpuLabel(cpu)).toBe(`${cpu.vendor} ${cpu.name}`)
  })
})

describe("cpusByVendor", () => {
  it("groups without losing or inventing entries", () => {
    const groups = cpusByVendor()
    const total = groups.reduce((n, g) => n + g.cpus.length, 0)
    expect(total).toBe(CPUS.length)
  })

  it("orders vendors alphabetically for a stable dropdown", () => {
    const vendors = cpusByVendor().map((g) => g.vendor)
    expect(vendors).toEqual([...vendors].sort())
  })
})

describe("searchCpus", () => {
  it("matches on the model number people actually remember", () => {
    const ids = searchCpus("7800X3D").map((c) => c.id)
    expect(ids).toContain("amd-ryzen-7-7800x3d")
  })

  it("matches on vendor", () => {
    expect(searchCpus("apple").every((c) => c.vendor === "Apple")).toBe(true)
  })

  it("matches every term, not just the first", () => {
    // "intel ultra 9" must not return every Intel chip.
    const found = searchCpus("intel ultra 9")
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((c) => c.name.toLowerCase().includes("ultra 9"))).toBe(true)
  })

  it("ignores case and surrounding space", () => {
    expect(searchCpus("  m4 max  ").map((c) => c.id)).toContain("apple-m4-max")
  })

  it("returns nothing for a chip that is not listed", () => {
    expect(searchCpus("pentium ii")).toHaveLength(0)
  })

  it("caps results, so a broad query cannot return the whole catalogue", () => {
    // The picker renders what it is given; an unbounded list would jank.
    expect(searchCpus("core", 5)).toHaveLength(5)
    expect(searchCpus("ryzen", 3)).toHaveLength(3)
  })

  it("returns nothing until something is typed", () => {
    // 227 chips is a wall, not a menu. The search is the way in; an opening
    // list only invites scrolling past the answer.
    expect(searchCpus("")).toHaveLength(0)
    expect(searchCpus("   ")).toHaveLength(0)
  })
})

describe("searchCpus on what a terminal actually prints", () => {
  /**
   * The strings people paste, and the chip each one is.
   *
   * Every one of these used to find nothing, because matching required every
   * word and `lscpu` supplies several the catalogue was never going to have.
   * Anyone who pasted reached for "Other", so the board filled with entries
   * for chips it already had names for.
   */
  const pastes: [string, string][] = [
    ["AMD Ryzen 9 7900X 12-Core Processor", "amd-ryzen-9-7900x"],
    ["AMD Ryzen 7 PRO 7840U w/ Radeon 780M Graphics", "amd-ryzen-7-7840u"],
    ["Intel(R) Core(TM) i7-13700K CPU @ 3.40GHz", "intel-core-i7-13700k"],
    ["13th Gen Intel(R) Core(TM) i7-1360P", "intel-core-i7-1360p"],
    ["model name\t: AMD Ryzen 9 9950X3D 16-Core Processor", "amd-ryzen-9-9950x3d"],
    ["AMD Ryzen 7 5800X3D 8-Core Processor", "amd-ryzen-7-5800x3d"],
  ]

  for (const [paste, id] of pastes) {
    it(`finds ${id} in ${JSON.stringify(paste)}`, () => {
      expect(searchCpus(paste)[0]?.id).toBe(id)
    })
  }

  it("treats a hyphen and a space as the same separator", () => {
    // Nobody should have to remember which side Intel puts the hyphen on.
    expect(searchCpus("i7 13700K")[0]?.id).toBe("intel-core-i7-13700k")
    expect(searchCpus("i7-13700K")[0]?.id).toBe("intel-core-i7-13700k")
  })

  it("answers with the closest name first, not the first one in the file", () => {
    // Searching for the 7900 used to offer the 7900X3D above it, because the
    // order was the order of the catalogue.
    expect(searchCpus("Ryzen 9 7900")[0]?.id).toBe("amd-ryzen-9-7900")
    expect(searchCpus("M4")[0]?.id).toBe("apple-m4")
  })

  it("still refuses a chip the catalogue genuinely does not have", () => {
    // The escape hatch exists for exactly these, and a matcher loose enough
    // to answer them would put the wrong chip on somebody's entry.
    expect(searchCpus("Intel(R) N100")).toHaveLength(0)
    expect(searchCpus("Intel(R) Core(TM) i7-8550U CPU @ 1.80GHz")).toHaveLength(0)
  })

  it("does not let one loose word answer for the whole vendor", () => {
    // "intel ultra 9" must not return every Intel chip: a model number gets
    // to answer alone only when every word together found nothing.
    const found = searchCpus("intel ultra 9")
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((c) => c.name.toLowerCase().includes("ultra 9"))).toBe(true)
  })
})

describe("normalizeCpuText", () => {
  it("strips what a kernel adds and a catalogue never carries", () => {
    expect(normalizeCpuText("AMD Ryzen 9 7900X 12-Core Processor")).toBe(
      "amd ryzen 9 7900x",
    )
    expect(normalizeCpuText("Intel(R) Core(TM) i7-13700K CPU @ 3.40GHz")).toBe(
      "intel core i7 13700k",
    )
    expect(normalizeCpuText("AMD Ryzen 7 7840U w/ Radeon 780M Graphics")).toBe(
      "amd ryzen 7 7840u",
    )
  })

  it("comes back empty when there was nothing to say", () => {
    // What `searchCpus` leans on to decide it has not been asked anything.
    expect(normalizeCpuText("   ")).toBe("")
    expect(normalizeCpuText("(R)")).toBe("")
  })
})
