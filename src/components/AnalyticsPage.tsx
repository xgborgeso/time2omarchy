import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight } from "lucide-react"
import { StatTile } from "@/components/stats/StatTile"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ANALYTICS_URL } from "@/lib/links"
import { useTRPC } from "@/lib/trpc"

/**
 * Traffic, as opposed to installs.
 *
 * Deliberately not a placeholder waiting on a provider. Everything here is
 * counted by this app already — the same figures the badge quotes — so the page
 * is honest on its own, and the hosted dashboard becomes a link out of it
 * rather than the only reason it exists.
 *
 * The Stats page is about the board: times, hardware, who is fastest. This one
 * is about the site: who came, and how often.
 */
export function AnalyticsPage() {
  const trpc = useTRPC()
  const { data, isError, isLoading } = useQuery(
    trpc.board.queryOptions({ page: 1 }, { refetchInterval: 30_000 }),
  )

  if (isLoading) {
    return (
      <div className="mt-8 flex flex-col gap-3">
        <Skeleton className="h-24 bg-card" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="mt-10 border-y border-card py-10 text-center text-destructive text-sm">
        Could not load analytics.
      </p>
    )
  }

  const { counters } = data

  return (
    <div className="mt-8 flex flex-col gap-3.5">
      <div>
        <h1 className="font-bold text-2xl tracking-tight sm:text-[26px]">Analytics</h1>
        <p className="mt-1.5 font-light text-[13px] text-muted-foreground">
          Everyone who came here, since the site opened.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Visitors"
          value={counters.visitors.toLocaleString("en-US")}
          note={`+${counters.visitorsToday} today`}
        />
        <StatTile label="Pageviews" value={counters.pageviews.toLocaleString("en-US")} />
        <StatTile
          label="Online"
          value={
            <span className="inline-flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-primary" />
              {counters.online}
            </span>
          }
          accent
        />
        <StatTile label="Ranked" value={counters.entries.toLocaleString("en-US")} />
      </div>

      {/* Only once there is somewhere to send people. An empty "coming soon"
          card is a promise the page cannot keep. */}
      {ANALYTICS_URL ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4">
          <p className="text-[13px] text-muted-foreground">
            Referrers, countries, and the rest live in the full dashboard.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={ANALYTICS_URL} target="_blank" rel="noreferrer">
              Open dashboard
              <ArrowUpRight />
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
