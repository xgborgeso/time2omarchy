import { BadgeCheck, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { xUrl } from "@/lib/handle"
import { formatSpecs } from "@/lib/specs"
import { formatTime, relativeTime } from "@/lib/time"
import type { BoardEntry } from "@/lib/types"

type Props = {
  entry: BoardEntry | null
  onClose: () => void
}

/** Radix handles focus trap, scroll lock and Escape. */
export function Lightbox({ entry, onClose }: Props) {
  const specs = entry ? formatSpecs(entry) : null

  return (
    <Dialog open={entry != null} onOpenChange={(open) => !open && onClose()}>
      {/*
       * The width has to be set on the `sm:` variant, not the base one.
       * DialogContent ships `sm:max-w-sm`, and tailwind-merge keeps a bare
       * `max-w-*` alongside a prefixed one rather than replacing it — so a
       * base utility here lost to 24rem on every screen above a phone, which
       * is what made the boot screen so small.
       *
       * No padding: the screen runs to the dialog's own edges and the caption
       * sits under a rule, the way an entry on the board does.
       */}
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border-border bg-popover p-0 sm:max-w-[min(64rem,92vw)]"
      >
        {entry ? (
          <>
            <DialogTitle className="sr-only">Boot screen for @{entry.handle}</DialogTitle>
            <DialogDescription className="sr-only">
              Boot screen for a {formatTime(entry.timeSeconds)} install.
            </DialogDescription>
            {/* Reserve space before the image decodes, so opening the dialog
                does not shift the caption underneath it. Boot screens are
                photographs of screens and arrive in every ratio, so the
                matting is black: it reads as a frame rather than as a gap. */}
            <div className="relative flex aspect-video max-h-[72vh] w-full items-center justify-center overflow-hidden bg-black">
              {/* biome-ignore lint/performance/noImgElement: boot screens are remote user uploads; next/image needs images.remotePatterns for the host, and the upload pipeline moves to UploadThing next */}
              <img
                src={entry.bootScreenUrl}
                alt={`Boot screen for @${entry.handle}`}
                className="max-h-full max-w-full object-contain"
              />
              {/* Our own, because the default sits at the dialog's corner and
                  a bare glyph is unreadable against whatever the boot screen
                  happens to be behind it. */}
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-3 right-3 bg-background/70 text-foreground backdrop-blur-sm hover:bg-background"
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-card px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-bold text-2xl text-primary tabular-nums">
                  {formatTime(entry.timeSeconds)}
                </span>
                <span className="rounded border border-border px-1.5 py-0.5 text-muted-foreground text-xs tabular-nums">
                  #{entry.rank}
                </span>
                <a
                  href={xUrl(entry.handle)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sm hover:text-primary"
                >
                  @{entry.handle}
                </a>
                {/* The same mark the board draws, so an entry looks like
                    itself whichever surface it is read on. */}
                {entry.verified ? (
                  <span
                    role="img"
                    aria-label="Verified on X"
                    title="Verified on X — this handle proved it owns the entry"
                    className="inline-flex shrink-0 self-center text-primary"
                  >
                    <BadgeCheck aria-hidden="true" className="size-3.5" />
                  </span>
                ) : null}
              </div>
              {/* Specs live here rather than on the board: the board's job is
                  time and rank, and three more columns would wreck it on a
                  phone. */}
              <p className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground text-xs">
                {specs ? <span>{specs}</span> : null}
                {specs ? (
                  <span aria-hidden="true" className="text-muted-foreground/50">
                    ·
                  </span>
                ) : null}
                <span className="whitespace-nowrap">{relativeTime(entry.updatedAt)}</span>
              </p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
