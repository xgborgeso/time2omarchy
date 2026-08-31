/**
 * The way in for everyone who already installed.
 *
 * Closed, this is one muted line and costs nothing to the person who has their
 * photo ready. Open, it is the whole path — the command, what it prints, and
 * where that number goes — without leaving the page.
 *
 * A disclosure rather than an info icon on purpose. The icon is the least
 * pressed control in interface design and has no hover on a phone, and this is
 * the single most useful thing the board can tell a returning Omarchy user.
 *
 * Deliberately not behind the sign-in gate. Ranking needs X, but finding out
 * whether you *can* rank must not — bouncing somebody to X to learn that their
 * time is recoverable asks them to commit before they know there is anything
 * to commit to. So this renders in the hero as well as in the form.
 */
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react"
import { useId, useState } from "react"
import { RECOVER_COMMAND, RECOVER_EXAMPLE } from "@/lib/recover"
import { cn } from "@/lib/utils"

/** Long enough to read as confirmation, short enough not to look stuck. */
const COPIED_MS = 2000

export function RecoverHint({
  label,
  className,
}: {
  /** The closed line. It differs by placement: the hero is selling, the form is helping. */
  label: string
  className?: string
}) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(RECOVER_COMMAND)
      setCopied(true)
      window.setTimeout(() => setCopied(false), COPIED_MS)
    } catch {
      // Swallowed: the clipboard is refused in some browsers and absent over
      // plain http, and neither is something the reader can act on. The command
      // is rendered as selectable text, so failing to copy leaves them exactly
      // where they would have been without the button.
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group inline-flex items-center gap-1.5 self-center text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="underline decoration-border underline-offset-4 group-hover:decoration-primary">
          {label}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3 text-left"
        >
          <p className="text-[12px] font-light text-muted-foreground">
            Omarchy timed your install and kept the receipt. Run this, then screenshot your
            terminal and upload that instead of a boot screen.
          </p>

          <div className="flex items-start gap-2 rounded-md border border-border bg-background p-2">
            {/* Wrapped rather than scrolled. A hundred characters in a narrow
                box means a scrollbar parked across the command on every
                platform that draws them, and half of it hidden behind that —
                for a string whose whole job is to be read once and copied.
                `break-all` because the jq filter is one long space-free token
                that no word break would help. */}
            <code className="min-w-0 flex-1 whitespace-pre-wrap break-all text-[11px] leading-relaxed text-foreground">
              {RECOVER_COMMAND}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? (
                <CheckIcon aria-hidden="true" className="size-3 text-primary" />
              ) : (
                <CopyIcon aria-hidden="true" className="size-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <p className="text-[11px] font-light text-muted-foreground">
            Prints <span className="text-primary">{RECOVER_EXAMPLE}</span> — the seconds go
            in the time field.
          </p>
        </div>
      ) : null}
    </div>
  )
}
