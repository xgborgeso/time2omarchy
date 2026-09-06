/**
 * The decision log for chips the catalogue was asked for.
 *
 * A file rather than a table, and checked in beside `cpus.ts`, because that is
 * what it annotates. A decision is hand-made, permanent — a rejection should
 * never need deciding twice — and it belongs in the same pull request as the
 * catalogue line it justifies. In a table it would live only in production,
 * invisible to the repository and unreviewable.
 *
 * Nothing here decides anything. `--sync` collects what people asked for and
 * `--apply` carries out what a person already ruled on; the verdict in between
 * comes from someone reading a vendor's own page.
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { z } from "zod"
import { CPUS, type Cpu, normalizeCpuText } from "../lib/cpus"

/** Beside the catalogue, so whoever opens one finds the other. */
export const REQUESTS_PATH = path.resolve("src/lib/cpu-requests.json")
const CATALOGUE_PATH = path.resolve("src/lib/cpus.ts")

/**
 * What a person writes into a request, and the only thing they must write.
 *
 * `approved` carries the facts they verified off the platform — the vendor's
 * own spelling — because that is the part no amount of parsing can supply. The
 * id is derived from them rather than typed, so it cannot drift from the
 * convention `tests/cpus.test.ts` enforces.
 */
const decisionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({
    status: z.literal("rejected"),
    note: z.string().min(1, "Say why, so it is not re-decided later."),
  }),
  z.object({
    status: z.literal("approved"),
    cpu: z.object({
      vendor: z.enum(["AMD", "Apple", "Intel"]),
      family: z.string().min(1),
      name: z.string().min(1),
    }),
  }),
])

const requestSchema = z
  .object({
    /** The normalized text, which is what groups two spellings into one ask. */
    query: z.string().min(1),
    /** One spelling as it was actually written, for a human to read. */
    reported: z.string().min(1),
    entries: z.number().int().nonnegative(),
    lastSeen: z.string(),
  })
  .and(decisionSchema)

export const requestsFileSchema = z.object({ requests: z.array(requestSchema) })

export type CpuRequestRecord = z.infer<typeof requestSchema>
export type RequestsFile = z.infer<typeof requestsFileSchema>

/**
 * The log, refused rather than guessed at when it is malformed.
 *
 * A status typed as "aproved" is the failure that matters here: silently
 * ignored it looks exactly like a decision that was never made, and the chip
 * quietly never arrives. `pnpm check` parses this file for that reason.
 */
export function readRequests(file = REQUESTS_PATH): RequestsFile {
  const parsed = requestsFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")))
  if (!parsed.success) {
    throw new Error(
      `${path.relative(process.cwd(), file)} is not a valid decision log:\n` +
        parsed.error.issues
          /* v8 ignore next -- @preserve: every issue this schema raises names a field */
          .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("\n"),
    )
  }
  return parsed.data
}

export function writeRequests(next: RequestsFile, file = REQUESTS_PATH): void {
  // Sorted by query so a sync appends predictably and two runs cannot produce
  // different diffs from the same data.
  const requests = [...next.requests].sort((a, b) => a.query.localeCompare(b.query))
  writeFileSync(file, `${JSON.stringify({ requests }, null, 2)}\n`)
}

/**
 * The slug a chip gets, derived from the two facts a person verified.
 *
 * Never typed, so it cannot disagree with the vendor prefix and kebab-case
 * rules the catalogue tests enforce. `+` becomes "plus" because the catalogue
 * already spells `Ryzen AI Max+ 395` that way, and an id is never renamed.
 */
export function cpuIdFor(vendor: string, name: string): string {
  return `${vendor} ${name}`
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** What an approved request becomes, once it is a chip. */
export function approvedCpus(file: RequestsFile): Cpu[] {
  return file.requests
    .filter((request) => request.status === "approved")
    .map((request) => ({
      id: cpuIdFor(request.cpu.vendor, request.cpu.name),
      vendor: request.cpu.vendor,
      family: request.cpu.family,
      name: request.cpu.name,
    }))
}

/**
 * Rewrites the catalogue array from the merged, sorted list.
 *
 * The whole array rather than an insertion at the right line: string surgery
 * that has to find a sorted position is one unusual entry away from writing a
 * broken file, and regenerating from `CPUS` itself cannot produce anything the
 * module did not already contain. Biome then formats it, so the diff shows the
 * additions and nothing else.
 */
export function writeCatalogue(additions: readonly Cpu[], file = CATALOGUE_PATH): number {
  const known = new Set(CPUS.map((cpu) => cpu.id))
  const fresh = additions.filter((cpu) => !known.has(cpu.id))
  if (fresh.length === 0) return 0

  const merged = [...CPUS, ...fresh].sort((a, b) => a.id.localeCompare(b.id))
  const body = merged
    .map(
      (cpu) =>
        `  { id: ${JSON.stringify(cpu.id)}, vendor: ${JSON.stringify(cpu.vendor)}, ` +
        `family: ${JSON.stringify(cpu.family)}, name: ${JSON.stringify(cpu.name)} },`,
    )
    .join("\n")

  const source = readFileSync(file, "utf8")
  const opening = "export const CPUS: readonly Cpu[] = [\n"
  const start = source.indexOf(opening)
  if (start === -1) throw new Error("Could not find the CPUS array in cpus.ts.")
  const end = source.indexOf("\n]\n", start)
  if (end === -1) throw new Error("Could not find the end of the CPUS array in cpus.ts.")

  writeFileSync(file, source.slice(0, start + opening.length) + body + source.slice(end))
  return fresh.length
}

/**
 * Formats whatever was just generated.
 *
 * Separate from the write so the generator stays pure and testable, but still
 * inside the tool: an unformatted catalogue fails `pnpm lint`, and a step that
 * reliably breaks CI is not one to leave to whoever runs the script.
 */
export function formatCatalogue(file = CATALOGUE_PATH): void {
  execFileSync(path.resolve("node_modules/.bin/biome"), ["check", "--write", file], {
    stdio: "ignore",
  })
}

/** Which normalized queries an approved decision now answers, and with what. */
export function promotions(file: RequestsFile): Map<string, string> {
  const map = new Map<string, string>()
  for (const request of file.requests) {
    if (request.status !== "approved") continue
    // Normalized from the reported spelling, not the stored `query`: that one
    // is only as current as the last sync, and the normalizer changes.
    map.set(
      normalizeCpuText(request.reported),
      cpuIdFor(request.cpu.vendor, request.cpu.name),
    )
  }
  return map
}
