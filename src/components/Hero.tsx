import { xUrl } from "@/lib/handle"
import { heroSubline } from "@/lib/hero"
import { formatTime } from "@/lib/time"
import type { Counters } from "@/lib/types"

export function Hero({ counters }: { counters: Counters | undefined }) {
  const fastest = counters?.fastestSeconds ?? null
  const entries = counters?.entries ?? 0
  const online = counters?.online ?? 0
  const leader = counters?.leaderHandle ?? null
  const leaders = counters?.leaderCount ?? 0
  const subline = heroSubline(leader, leaders)

  return (
    <section>
      <div className="flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-4 py-2 text-[11px] text-muted-foreground sm:text-xs">
          <span className="inline-flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            <span className="font-medium text-primary">{online} ONLINE</span>
          </span>
          <span className="text-muted-foreground" aria-hidden="true">
            ·
          </span>
          <span>{entries.toLocaleString()} RANKED</span>
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
          {subline.before}
          {subline.handle ? (
            <a
              href={xUrl(subline.handle)}
              target="_blank"
              rel="noreferrer"
              className="font-normal text-foreground underline underline-offset-4 hover:text-primary hover:no-underline"
            >
              @{subline.handle}
            </a>
          ) : null}
          {subline.after}
        </p>
      </div>
    </section>
  )
}
