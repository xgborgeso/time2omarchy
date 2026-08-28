import { FlagIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatTime } from "@/lib/time"
import type { BoardEntry } from "@/lib/types"

type Props = {
  entry: BoardEntry | null
  onClose: () => void
  /** Absent until there is somewhere for a report to go. */
  onReport?: (entry: BoardEntry) => void
  /** True once this viewer has flagged the entry being shown. */
  reported?: boolean
}

/**
 * A boot screen, bigger. Nothing else.
 *
 * No caption: every field one could carry — time, rank, handle, specs, when,
 * the verified mark — is already on the row that was clicked to open this,
 * inches away and still on screen behind it. Repeating them here made the
 * dialog look like a detail view for a record that has no detail.
 *
 * Radix handles focus trap, scroll lock and Escape.
 */
export function Lightbox({ entry, onClose, onReport, reported }: Props) {
  return (
    <Dialog open={entry != null} onOpenChange={(open) => !open && onClose()}>
      {/*
       * The width has to be set on the `sm:` variant, not the base one.
       * DialogContent ships `sm:max-w-sm`, and tailwind-merge keeps a bare
       * `max-w-*` alongside a prefixed one rather than replacing it — so a
       * base utility here lost to 24rem on every screen above a phone, which
       * is what made the boot screen so small.
       */}
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border-border p-0 sm:max-w-[min(64rem,92vw)]"
      >
        {entry ? (
          <>
            <DialogTitle className="sr-only">Boot screen for @{entry.handle}</DialogTitle>
            <DialogDescription className="sr-only">
              Boot screen for a {formatTime(entry.timeSeconds)} install by @{entry.handle}.
            </DialogDescription>
            {/* Reserve space before the image decodes, so opening the dialog
                does not resize it under the cursor. Boot screens are
                photographs of screens and arrive in every ratio, so the
                matting is black: it reads as a frame rather than as a gap. */}
            <div className="relative flex aspect-video max-h-[85vh] w-full items-center justify-center overflow-hidden bg-black">
              {/* biome-ignore lint/performance/noImgElement: boot screens are remote user uploads; next/image needs images.remotePatterns for the host, and the upload pipeline moves to UploadThing next */}
              <img
                src={entry.bootScreenUrl}
                alt={`Boot screen for @${entry.handle}`}
                className="max-h-full max-w-full object-contain"
              />
              {/* Ours, because the default sits at the dialog's corner and a
                  bare glyph is unreadable against whatever the boot screen
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
              {/* Under the close, and an icon like it: reporting is a rare
                  act on someone else's entry, so it sits where a control
                  already is rather than competing with the image. No count —
                  a public tally invites the pile-on it appears to measure,
                  and the number is only useful to whoever reviews it. */}
              {onReport ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={reported}
                  onClick={() => onReport(entry)}
                  title={
                    reported
                      ? "Reported — thanks, someone will look at it"
                      : "Report this boot screen"
                  }
                  aria-label={
                    reported
                      ? `Already reported the boot screen for @${entry.handle}`
                      : `Report the boot screen for @${entry.handle}`
                  }
                  className="absolute top-14 right-3 bg-background/70 text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-foreground disabled:opacity-100"
                >
                  <FlagIcon className={reported ? "fill-current" : undefined} />
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
