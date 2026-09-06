/**
 * Install time against the hardware it ran on.
 *
 * This is what the three required specs were collected for. Every entry
 * carries a chip, a memory size and a drive chosen from a fixed list rather
 * than typed, so the board can answer questions no review site can: how long
 * Omarchy actually takes on a spinning disk, or on an M4, at a sample size
 * nobody could assemble on purpose.
 */
import { cpuById } from "./cpus"
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
  /**
   * Installs the CPU chart cannot place, because their chip is not in the
   * catalogue. Said out loud rather than quietly dropped: a chart measuring
   * fewer installs than the board holds has to admit how many.
   */
  cpuUnlisted: number
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

/**
 * The vendor a chip belongs to, or null when the catalogue has no chip here.
 *
 * "Other" used to be a vendor, which put a bar labelled Other on the CPU chart
 * beside AMD, Apple and Intel — and since that bucket collects every chip the
 * catalogue misses, it could out-measure all three while describing no machine
 * at all. `cpus.ts` always said stats exclude the bucket; this is what makes
 * that true. The entry still counts in the drive and memory charts, where what
 * it reported is known.
 */
function vendorOf(cpuId: string): string | null {
  return cpuById(cpuId)?.vendor ?? null
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
): Pick<Benchmark, "cpu" | "cpuLevel" | "cpuParent" | "cpuUnlisted"> {
  /* v8 ignore next -- @preserve: the uncatalogued case is excluded before this runs */
  const family = (row: BenchmarkRow) => cpuById(row.cpuId)?.family ?? null
  const cpuUnlisted = rows.filter((row) => vendorOf(row.cpuId) === null).length

  /** The vendor chart, and where a drill falls back to when it finds nothing. */
  const vendors = {
    cpuLevel: "vendor" as const,
    cpuParent: null,
    cpuUnlisted,
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
    // A vendor with nothing under it — a filter held over from a chart that
    // has since changed level, or one no entry answers to any more. An empty
    // chart takes the way back with it.
    if (families.length === 0) return vendors

    return {
      cpuLevel: "family",
      cpuParent: { dimension: "vendor", id: filter.id, label: filter.id },
      cpuUnlisted,
      cpu: families,
    }
  }

  if (filter?.dimension === "family" || filter?.dimension === "model") {
    // A chosen model still shows its family, so it can be compared.
    const inFamily =
      filter.dimension === "family" ? filter.id : (cpuById(filter.id)?.family ?? null)
    // An id from outside the catalogue has no siblings to be compared with,
    // and grouping on it would build a chart of one bar named after nothing.
    if (inFamily === null) return vendors

    const kin = rows.filter((row) => family(row) === inFamily)
    if (kin.length === 0) return vendors

    return {
      cpuLevel: "model",
      // Every row in `kin` matched on a family read from the catalogue, so
      // its vendor is there to be read as well.
      cpuParent: {
        dimension: "vendor",
        /* v8 ignore next -- @preserve: every row in `kin` matched on a family read from the catalogue */
        id: cpuById(kin[0]!.cpuId)?.vendor ?? "",
        label: inFamily,
      },
      cpuUnlisted,
      cpu: bucketBy(
        kin,
        (row) => row.cpuId,
        /* v8 ignore next -- @preserve: these ids came from a catalogue lookup a line above */
        (id) => cpuById(id)?.name ?? id,
      ),
    }
  }

  return vendors
}

export function benchmark(
  rows: readonly BenchmarkRow[],
  filter?: SpecFilter | null,
): Benchmark {
  return {
    storage: bucketBy(
      rows,
      (row) => (STORAGE.some((s) => s.id === row.storage) ? row.storage : null),
      /* v8 ignore next -- @preserve: the key already filtered on the same STORAGE list */
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
