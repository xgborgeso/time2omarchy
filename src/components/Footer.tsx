import { xUrl } from "@/lib/handle"
import { OMARCHY_URL } from "@/lib/links"
import type { View } from "@/lib/view"

type Props = {
  onNavigate: (view: View) => void
}

export function Footer({ onNavigate }: Props) {
  return (
    <footer className="mt-11 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-card pt-5 pb-10 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => onNavigate("rules")}
        className="inline-flex min-h-11 items-center hover:text-foreground"
      >
        Rules
      </button>
      <button
        type="button"
        onClick={() => onNavigate("stats")}
        className="inline-flex min-h-11 items-center hover:text-foreground"
      >
        Stats
      </button>
      <a
        href="https://github.com"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center hover:text-foreground"
      >
        GitHub
      </a>
      <span className="text-dim" aria-hidden="true">
        ·
      </span>
      <span className="text-muted-foreground">
        <a
          href={OMARCHY_URL}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Omarchy
        </a>{" "}
        is by{" "}
        <a
          href={xUrl("dhh")}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          DHH
        </a>
        . This is a fan leaderboard.
      </span>
    </footer>
  )
}
