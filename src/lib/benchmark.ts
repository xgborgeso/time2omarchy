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

/** How far into the chip catalogue the CPU chart is currently looking. */
export type CpuLevel = "vendor" | "family" | "model"

export type Benchmark = {
  storage: SpecBucket[]
  /** The CPU chart, at whichever level the drill has reached. */
  cpu: SpecBucket[]
  cpuLevel: CpuLevel
  /** What was drilled into, so the way back can be offered. */
  cpuParent: (SpecFilter & { label: string }) | null
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

/**
 * The CPU chart, one level deep at a time.
 *
 * Forty-one families in a single chart is unreadable, and two hundred models
 * is worse — so the chart shows vendors until one is chosen, then that
 * vendor's families, then that family's models. Choosing a model keeps its
 * siblings on screen: a chart with one bar compares nothing.
 */
function cpuChart(
  rows: readonly BenchmarkRow[],
  filter?: SpecFilter | null,
): Pick<Benchmark, "cpu" | "cpuLevel" | "cpuParent"> {
  const family = (row: BenchmarkRow) => cpuById(row.cpuId)?.family ?? null

  /** The vendor chart, and where a drill falls back to when it finds nothing. */
  const vendors = {
    cpuLevel: "vendor" as const,
    cpuParent: null,
    cpu: bucketBy(
      rows,
      (row) => vendorOf(row.cpuId),
      (id) => id,
    ),
  }

  if (filter?.dimension === "vendor") {
    const families = bucketBy(
      rows.filter((row) => vendorOf(row.cpuId) === filter.id),
      family,
      (id) => id,
    )
    // "Other" is every chip off the catalogue, so it has no families and no
    // models. Drilling into it produced an empty chart, and an empty chart
    // takes the way back with it.
    if (families.length === 0) return vendors

    return {
      cpuLevel: "family",
      cpuParent: { dimension: "vendor", id: filter.id, label: filter.id },
      cpu: families,
    }
  }

  if (filter?.dimension === "family" || filter?.dimension === "model") {
    // A chosen model still shows its family, so it can be compared.
    const inFamily =
      filter.dimension === "family" ? filter.id : (cpuById(filter.id)?.family ?? null)
    const kin = rows.filter((row) => family(row) === inFamily)
    if (kin.length === 0) return vendors

    return {
      cpuLevel: "model",
      cpuParent: inFamily
        ? {
            dimension: "vendor",
            id: vendorOf(kin[0]?.cpuId ?? ""),
            label: inFamily,
          }
        : null,
      cpu: bucketBy(
        kin,
        (row) => row.cpuId,
        (id) => cpuById(id)?.name ?? id,
      ),
    }
  }

  return {
    cpuLevel: "vendor",
    cpuParent: null,
    cpu: bucketBy(
      rows,
      (row) => vendorOf(row.cpuId),
      (id) => id,
    ),
  }
}

export function benchmark(
  rows: readonly BenchmarkRow[],
  filter?: SpecFilter | null,
): Benchmark {
  return {
    storage: bucketBy(
      rows,
      (row) => (STORAGE.some((s) => s.id === row.storage) ? row.storage : null),
      (id) => storageLabel(id) ?? id,
    ),
    ...cpuChart(rows, filter),
    ram: bucketBy(
      rows,
      (row) =>
        (RAM_OPTIONS as readonly number[]).includes(row.ramGb) ? String(row.ramGb) : null,
      (id) => `${id} GB`,
    ),
  }
}

/** Which dimension a chosen bucket belongs to, and which bucket it is. */
export type SpecFilter = {
  dimension: "storage" | "ram" | CpuLevel
  id: string
}

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
    case "ram":
      return String(row.ramGb) === filter.id
    case "vendor":
      return vendorOf(row.cpuId) === filter.id
    case "family":
      return cpuById(row.cpuId)?.family === filter.id
    case "model":
      return row.cpuId === filter.id
  }
}
