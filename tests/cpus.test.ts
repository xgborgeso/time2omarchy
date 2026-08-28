import { describe, expect, it } from "vitest"
import { CPU_IDS, CPUS, cpuById, cpuLabel, cpusByVendor, searchCpus } from "@/lib/cpus"

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
    expect(searchCpus("", 10)).toHaveLength(10)
    expect(searchCpus("core", 5)).toHaveLength(5)
  })

  it("offers a starting set when the query is empty", () => {
    expect(searchCpus("").length).toBeGreaterThan(0)
  })
})
