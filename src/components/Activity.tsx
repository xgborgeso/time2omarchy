import { xUrl } from "@/lib/handle"
import { formatTime, relativeTime } from "@/lib/time"
import type { ActivityItem } from "@/lib/types"

type Props = {
  items: ActivityItem[]
  onStats: () => void
}

export function Activity({ items, onStats }: Props) {
  if (items.length === 0) return null

  return (
    <section className="mt-10 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Latest
        </h2>
        <button
          type="button"
          onClick={onStats}
          className="inline-flex min-h-11 items-center gap-1.5 text-[11px] font-medium uppercase text-muted-foreground hover:text-foreground"
        >
          All stats
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.slice(0, 4).map((item) => (
          <li
            key={`${item.handle}-${item.updatedAt}`}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <a
              href={xUrl(item.handle)}
              target="_blank"
              rel="noreferrer"
              className="-my-1.5 truncate py-1.5 text-[13px] hover:text-primary"
            >
              @{item.handle}
            </a>
            <span className="text-xs text-muted-foreground">
              <span className="text-primary">{formatTime(item.timeSeconds)}</span> ·{" "}
              {relativeTime(item.updatedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
