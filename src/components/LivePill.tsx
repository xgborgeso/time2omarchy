/**
 * Who else is here.
 *
 * The numbers come from Datafast rather than from anything this site records —
 * see `src/server/analytics.ts`. Nothing here is measured locally, and the
 * page sets no cookie to produce it.
 *
 * The live figure never appears alone. On a quiet hour "1 online" reads as an
 * empty room, and the cumulative count is what makes the same number read as
 * activity instead.
 */
import { ANALYTICS_URL } from "@/lib/links"
import type { Audience } from "@/lib/types"
import { cn } from "@/lib/utils"

export function LivePill({
  audience,
  className,
}: {
  audience: Audience | null
  className?: string
}) {
  // Null covers an unset key, an outage and a slow reply alike. A missing pill
  // is unremarkable; a broken one is not.
  if (!audience) return null

  const { online, visitors } = audience

  return (
    <div
      className={cn(
        // Wraps rather than truncates: on a narrow phone this is two lines,
        // and dropping a number would be worse than using the space.
        "mx-auto flex w-fit flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border bg-card px-3 py-1.5 font-normal text-[11px] sm:text-xs",
        className,
      )}
    >
      <span className="relative flex size-1.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
      </span>
      <span className="font-medium text-primary tabular-nums">{online} online</span>
      <span aria-hidden="true" className="text-muted-foreground/50">
        ·
      </span>
      <span className="text-muted-foreground tabular-nums">
        {visitors.toLocaleString("en-US")} {visitors === 1 ? "visitor" : "visitors"}
      </span>
      {/* Only once there is somewhere to go. The dashboard is hosted, so this
          is a link out rather than a route — there is no analytics page here,
          and an empty one would be worse than none. */}
      {ANALYTICS_URL ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground/50">
            ·
          </span>
          <a
            href={ANALYTICS_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            see analytics ↗
          </a>
        </>
      ) : null}
    </div>
  )
}
