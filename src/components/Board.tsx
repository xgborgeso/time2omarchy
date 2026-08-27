import { BadgeCheck } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { xUrl } from "@/lib/handle"
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
  "grid grid-cols-[2rem_4.75rem_minmax(0,1fr)_2.75rem] items-center gap-2.5 sm:grid-cols-[3.5rem_7.25rem_minmax(0,1fr)_auto_4.75rem] sm:gap-5"

/** The whole board. Equal times share a rank, so there is no podium to fill. */
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

      {entries.map((entry) => {
        const leads = entry.rank === 1
        return (
          <div
            key={entry.handle}
            className={cn(
              `${ROW} border-b border-card px-3 py-3 sm:px-5`,
              leads && "bg-muted/50",
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
            <span className="flex min-w-0 items-center gap-1.5">
              <a
                href={xUrl(entry.handle)}
                target="_blank"
                rel="noreferrer"
                className="-my-2 truncate py-2 text-[13px] hover:text-primary sm:text-sm"
              >
                @{entry.handle}
              </a>
              {entry.verified ? (
                <span
                  role="img"
                  aria-label="Handle verified on X"
                  // Sighted users never see an aria-label, and without this the
                  // mark is unexplained decoration. Lucide icons take no title.
                  title="Verified on X — this handle proved it owns the entry"
                  className="inline-flex shrink-0"
                >
                  <BadgeCheck
                    aria-hidden="true"
                    className="size-3.5 text-primary sm:size-4"
                  />
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
      })}
    </section>
  )
}
