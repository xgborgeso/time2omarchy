import { LiveBadge } from "@/components/LiveBadge"
import { heroSubline } from "@/lib/hero"
import { formatTime } from "@/lib/time"
import type { Counters } from "@/lib/types"

export function Hero({ counters }: { counters: Counters | undefined }) {
  const fastest = counters?.fastestSeconds ?? null

  return (
    <section>
      <div className="flex justify-center">
        <LiveBadge counters={counters} />
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
