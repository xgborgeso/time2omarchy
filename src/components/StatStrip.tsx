/**
 * The board's own figures, and the way through to the rest of them.
 *
 * The stats page existed with nothing on the board pointing at it — you found
 * it by reading the nav. These are two numbers worth seeing anyway, and
 * both of them are a door.
 *
 * The fastest time is deliberately absent: the hero prints it three times the
 * size directly above, and repeating it here said the same thing twice in one
 * glance. What is left is the pair the hero cannot show — the middle of the
 * board, and how many are on it.
 *
 * The median leads. A board with two entries that opens with "2" reads as
 * abandoned; opening with a time reads as something to measure yourself
 * against. Reorder when the count is worth leading with.
 */

import { ArrowRightIcon } from "lucide-react"
import { formatTime } from "@/lib/time"
import type { Counters } from "@/lib/types"

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <a
      // The hash is the whole navigation: App listens for `hashchange`, so
      // this needs no callback threaded down and the destination is a url
      // somebody can send to someone else.
      href="#stats"
      className="flex flex-col items-center gap-0.5 border-border border-r px-2 py-3 transition-colors last:border-r-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      <span className="font-bold text-lg text-primary tabular-nums leading-none tracking-tight">
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
        {label}
      </span>
    </a>
  )
}

export function StatStrip({ counters }: { counters: Counters | undefined }) {
  // Nothing to show and nothing to click through to: an empty board's stats
  // page is a row of dashes, which is worse than no invitation at all.
  if (!counters || counters.entries === 0) return null

  const { medianSeconds, entries } = counters

  return (
    <div className="mx-auto mt-7 w-full max-w-lg">
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card">
        <Cell
          value={medianSeconds != null ? formatTime(medianSeconds) : "—"}
          label="median"
        />
        {/* "ranked" either way: one entry is still "1 ranked", not "1 rankeds". */}
        <Cell value={String(entries)} label="ranked" />
      </div>
      {/* Said out loud, because numbers in a box do not look like a door.
          Without this line the strip reads as decoration.

          A drawn arrow rather than the "→" character: the glyph renders at
          whatever weight the font has for it, which next to 13px text is a
          faint smudge. This one is stroked to match the icons everywhere else
          and leans forward on hover. */}
      <a
        href="#stats"
        className="group mt-2 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="underline-offset-4 group-hover:underline">see all stats</span>
        <ArrowRightIcon
          aria-hidden="true"
          className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
        />
      </a>
    </div>
  )
}
