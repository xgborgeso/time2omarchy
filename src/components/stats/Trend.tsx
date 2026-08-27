import type { DayCount } from "@/lib/stats"

function shortDay(day: string): string {
  const [, month, date] = day.split("-")
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]
  return `${Number(date)} ${months[Number(month) - 1]}`
}

export function Trend({ daily }: { daily: DayCount[] }) {
  const max = Math.max(1, ...daily.map((d) => d.count))
  const peak = Math.max(0, ...daily.map((d) => d.count))
  const first = daily[0]
  const last = daily[daily.length - 1]

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Ranked, last {daily.length} days</h2>
        <span className="text-[11px] text-muted-foreground">peak {peak}</span>
      </div>

      <div className="mt-6 flex h-[110px] items-end gap-[3px] border-b border-border">
        {daily.map((day) => (
          <div key={day.day} className="group relative flex-1">
            <div
              className="w-full rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80"
              style={{ height: `${(day.count / max) * 110}px` }}
            />
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11px] shadow-lg group-hover:block"
            >
              <span className="text-foreground">{day.count}</span>{" "}
              <span className="text-muted-foreground">on {shortDay(day.day)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{first ? shortDay(first.day) : ""}</span>
        <span>{last ? "today" : ""}</span>
      </div>
    </section>
  )
}
