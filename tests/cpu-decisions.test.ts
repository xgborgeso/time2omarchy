import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { CPUS } from "@/lib/cpus"
import {
  approvedCpus,
  cpuIdFor,
  formatCatalogue,
  promotions,
  readRequests,
  requestsFileSchema,
  writeCatalogue,
} from "../src/server/cpu-decisions"

function tempFile(name: string, body: string): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "t2o-")), name)
  writeFileSync(file, body)
  return file
}

describe("the decision log", () => {
  it("ships parseable, so CI fails on a typo rather than the catalogue silently not growing", () => {
    // A status written "aproved" is the failure that matters: ignored, it
    // looks exactly like a decision nobody made, and the chip never arrives.
    expect(() => readRequests()).not.toThrow()
  })

  it("refuses a verdict it does not recognise", () => {
    const file = tempFile(
      "bad.json",
      JSON.stringify({
        requests: [
          {
            query: "x",
            reported: "X",
            entries: 1,
            lastSeen: "2026-01-01",
            status: "aproved",
          },
        ],
      }),
    )
    expect(() => readRequests(file)).toThrow(/decision log/)
  })

  it("makes a rejection say why, so it is not re-decided later", () => {
    const missing = requestsFileSchema.safeParse({
      requests: [
        {
          query: "x",
          reported: "X",
          entries: 1,
          lastSeen: "2026-01-01",
          status: "rejected",
        },
      ],
    })
    expect(missing.success).toBe(false)
  })
})

describe("cpuIdFor", () => {
  it("reproduces every id already in the catalogue", () => {
    // The id is derived rather than typed precisely so it cannot drift from
    // the convention tests/cpus.test.ts enforces. If this ever disagrees, one
    // of the two is wrong and a person should look.
    for (const cpu of CPUS) {
      expect(cpuIdFor(cpu.vendor, cpu.name)).toBe(cpu.id)
    }
  })
})

describe("applying approvals", () => {
  const file = {
    requests: [
      {
        query: "intel n100",
        reported: "Intel(R) N100",
        entries: 3,
        lastSeen: "2026-09-06",
        status: "approved" as const,
        cpu: { vendor: "Intel" as const, family: "Core N-series", name: "N100" },
      },
      {
        query: "amd ai proc",
        reported: "AMD AI Proc",
        entries: 1,
        lastSeen: "2026-09-06",
        status: "rejected" as const,
        note: "Cannot tell which Ryzen AI part this is.",
      },
    ],
  }

  it("turns an approval into a chip, and a rejection into nothing", () => {
    expect(approvedCpus(file)).toEqual([
      { id: "intel-n100", vendor: "Intel", family: "Core N-series", name: "N100" },
    ])
  })

  it("only ever promotes what was approved", () => {
    const map = promotions(file)
    expect(map.get("intel n100")).toBe("intel-n100")
    // The rejected one must never move an entry, however many people ask.
    expect(map.has("amd ai proc")).toBe(false)
  })

  it("writes the chip into the catalogue, still sorted by id", () => {
    const copy = tempFile("cpus.ts", readFileSync("src/lib/cpus.ts", "utf8"))
    const added = writeCatalogue(approvedCpus(file), copy)
    expect(added).toBe(1)

    const written = readFileSync(copy, "utf8")
    expect(written).toContain('id: "intel-n100"')

    const ids = [...written.matchAll(/^ {2}\{ id: "([^"]+)"/gm)].map((m) => m[1]!)
    expect(ids).toHaveLength(CPUS.length + 1)
    expect(ids).toEqual([...ids].sort())
  })

  it("adds nothing twice, so a second apply is a no-op", () => {
    const copy = tempFile("cpus.ts", readFileSync("src/lib/cpus.ts", "utf8"))
    const already = CPUS[0]!
    expect(writeCatalogue([already], copy)).toBe(0)
  })
})

describe("formatCatalogue", () => {
  it("leaves what it wrote able to pass the linter", () => {
    // Generated lines are written unformatted, and an unformatted catalogue
    // fails `pnpm lint` — a step that reliably breaks CI is not one to leave
    // for whoever ran the script.
    //
    // Inside the repo, not a temp directory: Biome refuses a path outside the
    // project it is configured for, and formatting `src/lib/cpus.ts` in place
    // is the only way this is ever actually called.
    const scratch = path.resolve("src/lib/cpus.generated-test.ts")
    try {
      writeFileSync(scratch, readFileSync("src/lib/cpus.ts", "utf8"))
      writeCatalogue(
        [{ id: "intel-n100", vendor: "Intel", family: "Core N-series", name: "N100" }],
        scratch,
      )
      expect(() => formatCatalogue(scratch)).not.toThrow()

      const formatted = readFileSync(scratch, "utf8")
      expect(formatted).toContain('id: "intel-n100"')
      // Biome wraps the generated one-liners; the point is that it ran.
      expect(formatted.split("\n").every((line) => line.length <= 100)).toBe(true)
    } finally {
      rmSync(scratch, { force: true })
    }
  })
})

describe("writing into a catalogue that is not one", () => {
  const chip = [
    { id: "intel-n100", vendor: "Intel" as const, family: "Core N-series", name: "N100" },
  ]

  it("refuses a file with no CPUS array in it", () => {
    // String surgery on a file that changed shape is how a catalogue gets
    // silently truncated, so it stops instead.
    const file = tempFile("cpus.ts", "export const NOTHING = []\n")
    expect(() => writeCatalogue(chip, file)).toThrow(/could not find the CPUS array/i)
  })

  it("refuses a file whose array never closes", () => {
    const file = tempFile(
      "cpus.ts",
      'export const CPUS: readonly Cpu[] = [\n  { id: "a" },\n',
    )
    expect(() => writeCatalogue(chip, file)).toThrow(/end of the CPUS array/i)
  })
})

describe("reporting a decision log that is wrong at the root", () => {
  it("names the root when the fault belongs to no field", () => {
    // `requests` missing entirely is a shape error with an empty path, and
    // "  : Required" reads as a bug in the checker rather than in the file.
    const file = tempFile("bad.json", JSON.stringify({}))
    expect(() => readRequests(file)).toThrow(/requests/i)
  })
})
