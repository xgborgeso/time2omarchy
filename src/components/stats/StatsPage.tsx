import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTime } from "@/lib/time"
import { useTRPC } from "@/lib/trpc"
import { Distribution } from "./Distribution"
import { StatTile } from "./StatTile"
import { Trend } from "./Trend"
import { YourRank } from "./YourRank"

export function StatsPage() {
  const trpc = useTRPC()
  const { data, isError, isLoading } = useQuery(
    trpc.stats.queryOptions(undefined, { refetchInterval: 30_000 }),
  )

  if (isLoading) {
    return (
      <div className="mt-8 flex flex-col gap-3">
        <Skeleton className="h-24 bg-card" />
        <Skeleton className="h-[300px] bg-card" />
        <Skeleton className="h-[200px] bg-card" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="mt-10 border-y border-card py-10 text-center text-sm text-destructive">
        Could not load stats.
      </p>
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-3.5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[26px]">Stats</h1>
        <p className="mt-1.5 text-[13px] font-light text-muted-foreground">
          Every install since launch. Updated live.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Ranked"
          value={data.entries.toLocaleString()}
          note={`+${data.rankedToday} today`}
        />
        <StatTile
          label="Record"
          value={data.fastestSeconds != null ? formatTime(data.fastestSeconds) : "—"}
          accent
        />
        <StatTile
          label="Median"
          value={data.medianSeconds != null ? formatTime(data.medianSeconds) : "—"}
          note={
            data.meanSeconds != null ? `mean ${formatTime(data.meanSeconds)}` : undefined
          }
        />
        <StatTile
          label="Online"
          value={
            <span className="inline-flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-primary" />
              {data.online}
            </span>
          }
          note={`${data.visitorsToday} ${data.visitorsToday === 1 ? "visitor" : "visitors"} today`}
        />
      </div>

      <Distribution
        buckets={data.distribution}
        total={data.entries}
        medianSeconds={data.medianSeconds}
      />

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Trend daily={data.daily} />
        <YourRank stats={data} />
      </div>
    </div>
  )
}
