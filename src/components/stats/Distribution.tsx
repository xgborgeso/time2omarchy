import { axisPosition, type TimeBucket } from "@/lib/stats"
import { formatTime } from "@/lib/time"

type Props = {
  buckets: TimeBucket[]
  total: number
  medianSeconds: number | null
}

/**
 * One series, so no legend — the heading names it. Bars carry the only hue;
 * every number stays in a text token.
 */
export function Distribution({ buckets, total, medianSeconds }: Props) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const busiest = buckets.reduce((a, b) => (b.count > a.count ? b : a), buckets[0]!)
  const median = medianSeconds != null ? axisPosition(medianSeconds, buckets) : null

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Install times</h2>
        <span className="text-[11px] text-muted-foreground">
          {total.toLocaleString()} ranked
        </span>
      </div>
      <p className="mt-1.5 text-xs font-light text-muted-foreground">
        {busiest.count > 0 ? `Most land in ${busiest.label}.` : "Nothing ranked yet."}
      </p>

      <div className="relative mt-7 h-[260px]">
        <div className="absolute inset-x-0 bottom-8 h-[200px] flex items-end gap-0.5">
          {buckets.map((bucket) => {
            const share = total > 0 ? Math.round((bucket.count / total) * 100) : 0
            return (
              <div
                key={bucket.label}
                className="group relative flex-1"
                style={{ height: `${(bucket.count / max) * 100}%` }}
              >
                {bucket.label === busiest.label && bucket.count > 0 ? (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] tabular-nums text-foreground">
                    {bucket.count.toLocaleString()}
                  </span>
                ) : null}
                <div className="size-full rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80" />
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-2 shadow-lg group-hover:block"
                >
                  <div className="text-[11px] text-foreground">{bucket.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {bucket.count.toLocaleString()}{" "}
                    {bucket.count === 1 ? "install" : "installs"} · {share}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {median != null ? (
          <>
            <div
              className="absolute bottom-8 top-6 z-20 w-px bg-terminal-cyan/70"
              style={{ left: `${median * 100}%` }}
              aria-hidden="true"
            />
            <span
              className="absolute top-0 z-20 translate-x-2 whitespace-nowrap text-[11px] text-terminal-cyan"
              style={{ left: `${median * 100}%` }}
            >
              median {formatTime(medianSeconds!)}
            </span>
          </>
        ) : null}

        <div
          className="absolute inset-x-0 bottom-8 border-b border-border"
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-0 flex h-8 items-center gap-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
          {buckets.map((bucket) => (
            <span key={bucket.label} className="flex-1 text-center">
              {bucket.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
