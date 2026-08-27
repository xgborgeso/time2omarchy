/** Distribution buckets for install times. Ranges are [from, to). */
export const TIME_BUCKETS = [
  { label: "<30s", from: 0, to: 30 },
  { label: "30–45s", from: 30, to: 45 },
  { label: "45–60s", from: 45, to: 60 },
  { label: "1:00–1:30", from: 60, to: 90 },
  { label: "1:30–2:00", from: 90, to: 120 },
  { label: "2:00–3:00", from: 120, to: 180 },
  { label: "3:00–5:00", from: 180, to: 300 },
  { label: "5:00+", from: 300, to: Infinity },
] as const

export type TimeBucket = {
  label: string
  from: number
  to: number
  count: number
}

export function bucketTimes(seconds: readonly number[]): TimeBucket[] {
  const buckets: TimeBucket[] = TIME_BUCKETS.map((b) => ({ ...b, count: 0 }))
  for (const value of seconds) {
    const bucket = buckets.find((b) => value >= b.from && value < b.to)
    if (bucket) bucket.count += 1
  }
  return buckets
}

/** Share of ranked installs strictly slower than `seconds`, as a whole percent. */
export function percentileRank(seconds: number, all: readonly number[]): number {
  if (all.length === 0) return 0
  const slower = all.filter((value) => value > seconds).length
  return Math.round((slower / all.length) * 100)
}

/** Seconds to shave to match the record. Null when no record exists. */
export function gapToLeader(seconds: number, fastest: number | null): number | null {
  if (fastest == null) return null
  return Math.max(0, seconds - fastest)
}

export type DayCount = { day: string; count: number }

/** Last `days` days ending at `today` (inclusive), zero-filled, oldest first. */
export function dailySeries(
  rows: readonly DayCount[],
  days: number,
  today: string,
): DayCount[] {
  const counts = new Map(rows.map((row) => [row.day, row.count]))
  const end = new Date(`${today}T00:00:00.000Z`)
  const series: DayCount[] = []
  for (let i = days - 1; i >= 0; i--) {
    const at = new Date(end)
    at.setUTCDate(at.getUTCDate() - i)
    const day = at.toISOString().slice(0, 10)
    series.push({ day, count: counts.get(day) ?? 0 })
  }
  return series
}

/**
 * Horizontal position of a time on a bucketed axis, as a 0–1 fraction.
 * Buckets each occupy an equal share of the width; the value is interpolated
 * within its bucket. The open-ended final bucket has no width to interpolate
 * across, so values there sit at its centre.
 */
export function axisPosition(seconds: number, buckets: readonly TimeBucket[]): number {
  if (buckets.length === 0) return 0
  const width = 1 / buckets.length
  const index = buckets.findIndex((b) => seconds >= b.from && seconds < b.to)
  if (index === -1) return seconds < buckets[0]!.from ? 0 : 1
  const bucket = buckets[index]!
  const within = Number.isFinite(bucket.to)
    ? (seconds - bucket.from) / (bucket.to - bucket.from)
    : 0.5
  return Math.min(1, Math.max(0, (index + within) * width))
}
