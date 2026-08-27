import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { gapToLeader, percentileRank } from "@/lib/stats"
import { formatTime, isTimeInRange, parseTime } from "@/lib/time"
import type { StatsResponse } from "@/lib/types"

/**
 * Reconstructs an approximate sample from the distribution so a visitor can
 * see where a time would land without submitting it.
 */
function sampleFrom(stats: StatsResponse): number[] {
  const sample: number[] = []
  for (const bucket of stats.distribution) {
    const mid = Number.isFinite(bucket.to)
      ? (bucket.from + bucket.to) / 2
      : bucket.from * 1.25
    for (let i = 0; i < bucket.count; i++) sample.push(mid)
  }
  return sample
}

export function YourRank({ stats }: { stats: StatsResponse }) {
  const [value, setValue] = useState("")

  const seconds = useMemo(() => {
    const parsed = parseTime(value)
    return parsed != null && isTimeInRange(parsed) ? parsed : null
  }, [value])

  const sample = useMemo(() => sampleFrom(stats), [stats])
  const percentile = seconds != null ? percentileRank(seconds, sample) : null
  const gap = seconds != null ? gapToLeader(seconds, stats.fastestSeconds) : null
  const rank = seconds != null ? sample.filter((s) => s < seconds).length + 1 : null

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 className="text-sm font-bold">Your rank</h2>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="your-time"
          className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          your time
        </Label>
        <Input
          id="your-time"
          placeholder="43s or 1:12"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 tabular-nums"
        />
      </div>

      {seconds == null ? (
        <p className="text-xs font-light text-muted-foreground">
          Enter a time to see your rank.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-3">
            <span className="text-[40px] font-bold leading-none text-primary">
              {formatTime(seconds)}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rank</span>
              <span className="text-foreground">
                ~#{rank} of {stats.entries.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(2, 100 - (percentile ?? 0))}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              Faster than {percentile}% of the board
            </span>
          </div>

          <p className="border-t border-border pt-3.5 text-xs text-muted-foreground">
            {gap === 0 ? (
              "That matches the record."
            ) : gap != null ? (
              <>
                Shave <span className="text-primary">{formatTime(gap)}</span> to match the
                record.
              </>
            ) : (
              "No record set yet — this would be it."
            )}
          </p>
        </>
      )}
    </section>
  )
}
