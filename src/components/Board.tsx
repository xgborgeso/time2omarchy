import { BadgeCheck } from "lucide-react"
import { Fragment } from "react"
import { Badge } from "@/components/ui/badge"
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
  onClaim?: (entry: BoardEntry) => void
  /**
   * An entry found by lookup, shown above the board.
   *
   * The board is capped at 100; past that this is the only way someone sees
   * their own entry, and the only way they can claim it.
   */
  found?: BoardEntry | null
}

// minmax(0,1fr) rather than 1fr: a grid item defaults to min-width:auto,
// which stops `truncate` from ever shrinking the handle column.
const ROW =
  "grid grid-cols-[2rem_4.75rem_minmax(0,1fr)_2.75rem] items-center gap-2.5 sm:grid-cols-[3.5rem_7.25rem_minmax(0,1fr)_auto_4.75rem] sm:gap-5"

/** Where a tier ends. The board is cut after the 10th and the 20th entry. */
const TIERS = [10, 20]

/** The first three, which get the weight everyone is actually competing for. */
const PODIUM = 3

/**
 * One page of the board.
 *
 * Equal times share a rank, so the podium can hold more than three entries —
 * the tint follows the rank, not the position in the list.
 */
export function Board({ entries, loading, onOpen, onClaim, found = null }: Props) {
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
    <section className="mt-12 flex flex-col border-t border-border sm:mt-16">
      <div
        className={`${ROW} border-b border-card px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:px-5`}
      >
        <span>rank</span>
        <span>time</span>
        <span>handle</span>
        <span className="hidden sm:block">when</span>
        <span className="text-right">boot</span>
      </div>

      {found ? (
        <div data-testid="found-entry">
          <Entry
            entry={found}
            onOpen={onOpen}
            onClaim={onClaim}
            className="border-primary/40 bg-muted/30"
          />
        </div>
      ) : null}

      {entries.map((entry, i) => (
        <Fragment key={entry.handle}>
          {/* A labelled rule where each tier ends, so the top of the board
              reads as a podium rather than a list that keeps going. Drawn
              from the entry's real rank, so a later page shows none of them. */}
          {TIERS.includes(entry.rank - 1) && i > 0 ? (
            <div className="flex items-center gap-3 px-3 py-4 sm:px-5">
              <span className="h-px flex-1 bg-border" />
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Top {entry.rank - 1}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}
          <Entry entry={entry} onOpen={onOpen} onClaim={onClaim} />
        </Fragment>
      ))}
    </section>
  )
}

type EntryProps = {
  entry: BoardEntry
  onOpen: (entry: BoardEntry) => void
  onClaim?: (entry: BoardEntry) => void
  className?: string
}

/**
 * One entry, used both in the board and on its own.
 *
 * The same markup either way: an entry found by lookup is the same object as
 * an entry in the top hundred, and looking different would suggest otherwise.
 */
function Entry({ entry, onOpen, onClaim, className }: EntryProps) {
  const leads = entry.rank === 1
  // The three everyone is actually competing for. Weighted by tint rather
  // than by size, so the columns stay aligned down the whole board.
  const podium = entry.rank <= PODIUM
  const specs = formatSpecsShort(entry)
  // Every unproven entry offers it: there is no logged-in state to know
  // whose is whose, and proving one is the only thing X is used for. A
  // claim on someone else's comes back naming both accounts, so the
  // offer stays honest even when the answer is no.
  const claimable = !!onClaim && !entry.verified
  return (
    <div
      data-podium={podium || undefined}
      className={cn(
        `${ROW} border-b border-card px-3 py-3 sm:px-5`,
        podium && "bg-primary/5",
        leads && "bg-primary/10",
        className,
      )}
    >
      <span
        className={cn(
          "text-xs tabular-nums sm:text-[13px]",
          podium ? "font-medium text-primary" : "text-muted-foreground",
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
      <span className="flex min-w-0 flex-col justify-center">
        <span className="flex min-w-0 items-center gap-1.5">
          <a
            href={xUrl(entry.handle)}
            target="_blank"
            rel="noreferrer"
            className="-my-2 truncate py-2 text-[13px] hover:text-primary sm:text-sm"
          >
            @{entry.handle}
          </a>
          {/* One slot, one shape, two jobs. Both are badges so the line reads
              the same either way, and the fill is what separates them: filled
              is something to do, outlined is something that is already true.
              Claim borrows the primary fill from Rank it for exactly that
              reason — it is the same invitation, met where the entry lives. */}
          {entry.verified ? (
            <Badge
              variant="outline"
              title="Verified on X — this handle proved it owns the entry"
            >
              <BadgeCheck aria-hidden="true" className="text-primary" />
              Verified
            </Badge>
          ) : claimable ? (
            // The stock hover rules only fire on an anchor (`[a&]:hover:`),
            // and this is a button, so the hover is the one thing added.
            <Badge asChild variant="default">
              <button
                type="button"
                onClick={() => onClaim?.(entry)}
                aria-label={`Claim the entry for @${entry.handle}`}
                className="cursor-pointer hover:bg-primary/90"
              >
                Claim
              </button>
            </Badge>
          ) : null}
        </span>
        {/* Hidden on phones, where the row has no width to spare.
        The full line, with storage, is in the lightbox. */}
        {specs ? (
          <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
            {specs}
          </span>
        ) : null}
      </span>
      <span className="hidden text-xs text-muted-foreground sm:block">
        {relativeTime(entry.updatedAt)}
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
          width={60}
          height={44}
          className="h-11 w-11 object-cover sm:w-15"
        />
      </button>
    </div>
  )
}
