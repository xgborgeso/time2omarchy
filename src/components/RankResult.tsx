import { ShareButton } from "@/components/ShareButton"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/time"
import type { RankSuccess } from "@/lib/types"

type Props = {
  placed: RankSuccess
  /** Back to the form, for another attempt at your own time. */
  onAgain: () => void
  onClose: () => void
}

/** What just happened, in the words that fit it. */
function headline(placed: RankSuccess): string {
  if (placed.keptBest) return "Your best still stands"
  if (placed.created) return "You're on the board"
  if (placed.improved) return "New best"
  return "Boot screen updated"
}

/**
 * The moment after ranking.
 *
 * It replaces the form rather than sitting under it. Left in place, the fields
 * cleared themselves on success and the dialog showed a completed action on top
 * of an empty, invalid form — press the button again out of reflex and you got
 * "Add a time" in red beneath "You're on the board" in green.
 *
 * Ranking again is still one press away, but it is opt-in: finishing is the
 * common case, and a form that reappears by default invites a second submit
 * nobody meant to make.
 */
export function RankResult({ placed, onAgain, onClose }: Props) {
  const { rank, timeSeconds } = placed.entry
  const total = placed.board.counters.entries

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <p role="status" className="font-medium text-primary text-sm">
          {headline(placed)}
        </p>
        <div className="flex items-baseline gap-4">
          <span className="font-bold text-5xl text-primary tabular-nums tracking-tighter sm:text-6xl">
            {formatTime(timeSeconds)}
          </span>
          {/* The position, in the board's own vocabulary. Ties are common, so
              this is the rank the row shows rather than a count of rows above. */}
          <span className="text-muted-foreground text-sm tabular-nums">
            #{rank} of {total.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <ShareButton position={{ rank, timeSeconds, total }} className="h-11 px-6" />
        <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">
          See the board
        </Button>
      </div>

      {/* Quiet, and last: beating your own time is a thing you come back for,
          not a thing to do twice in one sitting. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAgain}
        className="text-muted-foreground"
      >
        Beat it again
      </Button>
    </div>
  )
}
