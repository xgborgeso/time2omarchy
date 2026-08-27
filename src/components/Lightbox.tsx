import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { xUrl } from "@/lib/handle"
import { formatTime, relativeTime } from "@/lib/time"
import type { BoardEntry } from "@/lib/types"

type Props = {
  entry: BoardEntry | null
  onClose: () => void
}

/** Radix handles focus trap, scroll lock and Escape. */
export function Lightbox({ entry, onClose }: Props) {
  return (
    <Dialog open={entry != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[min(64rem,95vw)] border-border bg-popover p-4 sm:p-5">
        {entry ? (
          <>
            <DialogTitle className="sr-only">Boot screen for @{entry.handle}</DialogTitle>
            <DialogDescription className="sr-only">
              Boot screen for a {formatTime(entry.timeSeconds)} install.
            </DialogDescription>
            {/* Reserve space before the image decodes, so opening the dialog
                does not shift the caption underneath it. */}
            <div className="flex aspect-video max-h-[75vh] w-full items-center justify-center overflow-hidden rounded-sm bg-deep">
              {/* biome-ignore lint/performance/noImgElement: boot screens are remote user uploads; next/image needs images.remotePatterns for the host, and the upload pipeline moves to UploadThing next */}
              <img
                src={entry.bootScreenUrl}
                alt={`Boot screen for @${entry.handle}`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="text-2xl font-bold text-accent">
                {formatTime(entry.timeSeconds)}
              </span>
              <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                #{entry.rank}
              </span>
              <a
                href={xUrl(entry.handle)}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                @{entry.handle}
              </a>
              <span className="text-xs text-muted-foreground">
                {relativeTime(entry.updatedAt)}
              </span>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
