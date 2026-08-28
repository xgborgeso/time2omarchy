import { TriangleAlert } from "lucide-react"
import type { Benchmark, SpecBucket } from "@/lib/benchmark"
import { formatTime } from "@/lib/time"
import { cn } from "@/lib/utils"

/** Which dimension a chosen bucket belongs to. */
export type Dimension = keyof Benchmark

export type SpecFilter = { dimension: Dimension; id: string }

type Props = {
  hardware: Benchmark
  active: SpecFilter | null
  onFilter: (next: SpecFilter | null) => void
}

/**
 * Below this a bucket is an anecdote, not a measurement.
 *
 * Three installs on a spinning disk sitting beside eighty on flash, formatted
 * identically, is the difference between reporting data and making a claim.
 */
const ENOUGH = 10

/** No captions: the numbers underneath say it, and said it better. */
const TABLES: { dimension: Dimension; title: string }[] = [
  { dimension: "storage", title: "By drive" },
  { dimension: "vendor", title: "By CPU" },
  { dimension: "ram", title: "By memory" },
]

/**
 * Install time against the hardware it ran on.
 *
 * The three specs are required on every entry precisely so this table can
 * exist: a benchmark assembled from real installs, at a sample size no review
 * could gather on purpose. Median rather than mean, because one failing drive
 * would otherwise misdescribe every machine beside it.
 */
export function Hardware({ hardware, active, onFilter }: Props) {
  const measured = TABLES.filter(({ dimension }) => hardware[dimension].length > 0)
  if (measured.length === 0) return null

  // The slowest median anywhere sets the bar scale, so a bar means the same
  // thing in every table rather than being relative to its own column.
  const slowest = Math.max(
    ...measured.flatMap(({ dimension }) =>
      hardware[dimension].map((bucket) => bucket.medianSeconds),
    ),
  )

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold">Install time by hardware</h2>
        <p className="mt-1.5 text-xs font-light text-muted-foreground">
          Median of every ranked install. Pick a row to narrow everything above.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {measured.map(({ dimension, title }) => (
          <div
            key={dimension}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
          >
            <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {title}
            </h3>

            <ul className="flex flex-col gap-2.5">
              {hardware[dimension].map((bucket) => (
                <Bucket
                  key={bucket.id}
                  bucket={bucket}
                  dimension={dimension}
                  slowest={slowest}
                  active={active?.dimension === dimension && active.id === bucket.id}
                  onFilter={onFilter}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

type BucketProps = {
  bucket: SpecBucket
  dimension: Dimension
  slowest: number
  active: boolean
  onFilter: (next: SpecFilter | null) => void
}

function Bucket({ bucket, dimension, slowest, active, onFilter }: BucketProps) {
  const thin = bucket.entries < ENOUGH

  return (
    <li>
      <button
        type="button"
        data-testid={`bucket-${dimension}-${bucket.id}`}
        aria-pressed={active}
        onClick={() => onFilter(active ? null : { dimension, id: bucket.id })}
        className={cn(
          "flex w-full flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
          active && "bg-muted",
        )}
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs">
            {bucket.label}
            {thin ? (
              // Wrapped, because a Lucide icon takes no title of its own.
              <span
                role="img"
                aria-label={`Only ${bucket.entries} installs, too few to read much into`}
                title={`Only ${bucket.entries} installs — too few to read much into`}
                className="inline-flex shrink-0"
              >
                <TriangleAlert
                  aria-hidden="true"
                  className="size-3 text-muted-foreground"
                />
              </span>
            ) : null}
          </span>
          <span className="shrink-0 font-medium text-primary text-sm tabular-nums">
            {formatTime(bucket.medianSeconds)}
          </span>
        </span>

        <span className="flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full rounded-full",
                thin ? "bg-chart-1/40" : "bg-chart-1",
              )}
              style={{ width: `${Math.max(4, (bucket.medianSeconds / slowest) * 100)}%` }}
            />
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {bucket.entries.toLocaleString()}
          </span>
        </span>
      </button>
    </li>
  )
}
