import { heroSubline } from "@/lib/hero"
import { formatTime } from "@/lib/time"
import type { Counters } from "@/lib/types"

export function Hero({ counters }: { counters: Counters | undefined }) {
  const fastest = counters?.fastestSeconds ?? null
  const entries = counters?.entries ?? 0

  return (
    <section>
      <div className="flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-4 py-2 text-[11px] text-muted-foreground sm:text-xs">
          {/* The count of everyone here, and nothing else. A live visitor
              number is analytics wearing a badge: it belongs to whoever runs
              the site, and on a quiet hour it advertises an empty room. The
              ranked total only ever climbs. */}
          <span>
            {entries.toLocaleString()} {entries === 1 ? "INSTALL" : "INSTALLS"} RANKED
          </span>
        </div>
      </div>

      <div className="mt-14 flex flex-col items-center gap-4 text-center sm:mt-16 sm:gap-5">
        <div className="flex items-baseline gap-4 sm:gap-7">
          <span className="text-3xl font-light sm:text-[44px]">
            {fastest != null ? "BEAT" : "BE"}
          </span>
          <span className="text-[76px] font-bold leading-[0.9] tracking-tighter text-primary sm:text-[116px]">
            {fastest != null ? formatTime(fastest) : "FIRST"}
          </span>
        </div>
        <p className="max-w-[32rem] text-pretty text-[13px] font-light text-muted-foreground sm:text-[15px]">
          {heroSubline()}
        </p>
      </div>
    </section>
  )
}
