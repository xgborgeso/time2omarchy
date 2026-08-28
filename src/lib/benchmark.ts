/**
 * Install time against the hardware it ran on.
 *
 * This is what the three required specs were collected for. Every entry
 * carries a chip, a memory size and a drive chosen from a fixed list rather
 * than typed, so the board can answer questions no review site can: how long
 * Omarchy actually takes on a spinning disk, or on an M4, at a sample size
 * nobody could assemble on purpose.
 */
import { cpuById, OTHER_CPU_ID } from "./cpus"
import { RAM_OPTIONS, STORAGE, storageLabel } from "./specs"

export type BenchmarkRow = {
  timeSeconds: number
  cpuId: string
  ramGb: number
  storage: string
}

export type SpecBucket = {
  id: string
  label: string
  entries: number
  fastestSeconds: number
  medianSeconds: number
}

export type Benchmark = {
  storage: SpecBucket[]
  vendor: SpecBucket[]
  ram: SpecBucket[]
}

/**
 * The middle value, not the average.
 *
 * One install that took fifteen minutes on a failing drive would drag a mean
 * far enough to misdescribe every other machine in the bucket.
 */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/** Groups times by one key, then describes each group the same way. */
function bucketBy(
  rows: readonly BenchmarkRow[],
  key: (row: BenchmarkRow) => string | null,
  label: (id: string) => string,
): SpecBucket[] {
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    const id = key(row)
    if (id === null) continue
    const times = groups.get(id)
    if (times) times.push(row.timeSeconds)
    else groups.set(id, [row.timeSeconds])
  }

  return (
    [...groups]
      .map(([id, times]) => ({
        id,
        label: label(id),
        entries: times.length,
        fastestSeconds: Math.min(...times),
        medianSeconds: median(times) as number,
      }))
      // Fastest first: the whole table exists to answer "what should I expect".
      .sort((a, b) => a.medianSeconds - b.medianSeconds)
  )
}

/** The vendor a chip belongs to, with a home for anything off the catalogue. */
function vendorOf(cpuId: string): string {
  if (cpuId === OTHER_CPU_ID) return "Other"
  return cpuById(cpuId)?.vendor ?? "Other"
}

export function benchmark(rows: readonly BenchmarkRow[]): Benchmark {
  return {
    storage: bucketBy(
      rows,
      (row) => (STORAGE.some((s) => s.id === row.storage) ? row.storage : null),
      (id) => storageLabel(id) ?? id,
    ),
    vendor: bucketBy(
      rows,
      (row) => vendorOf(row.cpuId),
      (id) => id,
    ),
    ram: bucketBy(
      rows,
      (row) =>
        (RAM_OPTIONS as readonly number[]).includes(row.ramGb) ? String(row.ramGb) : null,
      (id) => `${id} GB`,
    ),
  }
}

/** Which dimension a chosen bucket belongs to, and which bucket it is. */
export type SpecFilter = { dimension: keyof Benchmark; id: string }

/**
 * Whether one entry belongs to the bucket that was chosen.
 *
 * Vendor is deliberately handled the same way it is grouped: derived from the
 * catalogue rather than read from a column, because the database only stores
 * the chip id and the two must never disagree about what "AMD" means.
 */
export function matchesSpec(row: BenchmarkRow, filter: SpecFilter): boolean {
  switch (filter.dimension) {
    case "storage":
      return row.storage === filter.id
    case "vendor":
      return vendorOf(row.cpuId) === filter.id
    case "ram":
      return String(row.ramGb) === filter.id
  }
}
