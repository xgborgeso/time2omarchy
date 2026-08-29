import { Badge } from "@/components/ui/badge"
import type { Counters } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  counters: Counters | undefined
  onNavigate: () => void
  className?: string
}

/**
 * Who is here, and how many have ever been.
 *
 * The live number is never shown alone. On a quiet hour "2 online" reads as an
 * empty room, which is worse than saying nothing — but beside a total that only
 * ever climbs it reads as activity, which is what it is.
 *
 * The dot pulses because the number is live; everything else here is cumulative
 * and still.
 *
 * This one line is the exception to keeping the board's own figures apart from
 * third-party traffic: it is a summary, and a reader glancing at it wants the
 * size of the thing, not the provenance of each number. The pages behind it
 * keep the two subjects separate.
 */
export function LiveBadge({ counters, onNavigate, className }: Props) {
  if (!counters) return null
  const { online, visitors, entries } = counters

  return (
    <Badge
      variant="outline"
      className={cn(
        // Wraps rather than truncates: on a narrow phone this is two lines,
        // and dropping a number would be worse than using the space.
        "flex-wrap justify-center gap-x-2 gap-y-1 rounded-full border-border bg-card px-3 py-1.5 font-normal text-[11px] sm:text-xs",
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
        {entries.toLocaleString("en-US")} ranked
      </span>
      <span aria-hidden="true" className="text-muted-foreground/50">
        ·
      </span>
      <span className="text-muted-foreground tabular-nums">
        {visitors.toLocaleString("en-US")} {visitors === 1 ? "visitor" : "visitors"}
      </span>
      <span aria-hidden="true" className="text-muted-foreground/50">
        ·
      </span>
      {/* A button, not a link: the views are hash-routed in one page, and an
          anchor here would be a second way to navigate that behaves differently. */}
      <button
        type="button"
        onClick={onNavigate}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        see stats →
      </button>
    </Badge>
  )
}
