import { Skeleton } from "@/components/ui/skeleton"
import { xUrl } from "@/lib/handle"
import { formatSpecsShort } from "@/lib/specs"
import { formatTime, relativeTime } from "@/lib/time"
import type { BoardEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  entries: BoardEntry[]
  loading: boolean
  onOpen: (entry: BoardEntry) => void
}

// minmax(0,1fr) rather than 1fr: a grid item defaults to min-width:auto,
// which stops `truncate` from ever shrinking the handle column.
const ROW =
  "grid grid-cols-[2rem_4.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 sm:grid-cols-[3.5rem_7.25rem_minmax(0,1fr)_5.5rem] sm:gap-5"

/**
 * One page of the board.
 *
 * No tiers and no podium: equal times share a rank, so "the top three" can be
 * five entries and a rule drawn after the tenth can land mid-tie. Only the
 * leader is marked, because that one is unambiguous.
 */
export function Board({ entries, loading, onOpen }: Props) {
  if (loading && entries.length === 0) {
    return (
      <div className="mt-6 flex flex-col gap-px">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholders with no identity; the list never reorders
          <Skeleton key={i} className="h-14 rounded-none bg-card" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) return null

  return (
    <section className="flex flex-col border-t border-border">
      <div
        className={`${ROW} border-b border-card px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5`}
      >
        <span>rank</span>
        <span>time</span>
        <span>handle</span>
        <span className="text-right">boot</span>
      </div>

      {entries.map((entry) => (
        <Entry key={entry.handle} entry={entry} onOpen={onOpen} />
      ))}
    </section>
  )
}

/** The separator in the small print. Decorative, so it is hidden from readers. */
function Dot() {
  return (
    <span aria-hidden="true" className="text-muted-foreground/50">
      ·
    </span>
  )
}

type EntryProps = {
  entry: BoardEntry
  onOpen: (entry: BoardEntry) => void
  className?: string
}

/**
 * One entry, used both in the board and on its own.
 *
 * The same markup either way: an entry found by lookup is the same object as
 * an entry in the top hundred, and looking different would suggest otherwise.
 */
function Entry({ entry, onOpen, className }: EntryProps) {
  const leads = entry.rank === 1
  const specs = formatSpecsShort(entry)
  return (
    <div
      className={cn(
        // Room to breathe: a badge sitting in a tight row reads as clutter,
        // and outbid's entries are nearly twice this tall for the same reason.
        `${ROW} border-b border-card px-3 py-4 sm:px-5 sm:py-5`,
        leads && "bg-muted/50",
        className,
      )}
    >
      <span
        className={cn(
          "text-xs tabular-nums sm:text-[13px]",
          leads ? "font-medium text-primary" : "text-muted-foreground",
        )}
      >
        #{entry.rank}
      </span>
      <span
        className={cn(
          "font-medium text-primary tabular-nums",
          leads ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
        )}
      >
        {formatTime(entry.timeSeconds)}
      </span>
      {/* A title and the small print under it, the way an entry reads on a
          board like this: the handle is the headline, everything that
          qualifies it sits below in one quiet line. */}
      <span className="flex min-w-0 flex-col justify-center gap-1">
        <a
          href={xUrl(entry.handle)}
          target="_blank"
          rel="noreferrer"
          className="-my-1 w-fit max-w-full truncate py-1 font-medium text-[13px] hover:text-primary sm:text-[15px]"
        >
          @{entry.handle}
        </a>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground sm:text-xs">
          {specs ? <span className="truncate">{specs}</span> : null}
          {specs ? <Dot /> : null}
          <span className="whitespace-nowrap">{relativeTime(entry.updatedAt)}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => onOpen(entry)}
        aria-label={`Open boot screen for @${entry.handle}`}
        className="justify-self-end overflow-hidden rounded-[3px] border border-border bg-muted hover:border-muted-foreground"
      >
        {/* biome-ignore lint/performance/noImgElement: boot screens are remote user uploads; next/image needs images.remotePatterns for the host, and the upload pipeline moves to UploadThing next */}
        <img
          src={entry.bootScreenUrl}
          alt=""
          loading="lazy"
          width={72}
          height={52}
          className="h-11 w-11 object-cover sm:h-13 sm:w-18"
        />
      </button>
    </div>
  )
}
