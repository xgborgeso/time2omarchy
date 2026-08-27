import { type BoardPosition, shareIntentUrl } from "@/lib/share"
import { cn } from "@/lib/utils"

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

type Props = {
  position: BoardPosition
  className?: string
}

export function ShareButton({ position, className }: Props) {
  return (
    <a
      href={shareIntentUrl(position)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5",
        "text-sm font-bold uppercase text-primary-foreground transition-all",
        "hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
        className,
      )}
    >
      <XLogo className="size-3.5" />
      Share on X
    </a>
  )
}
