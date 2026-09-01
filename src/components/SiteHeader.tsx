import { xUrl } from "@/lib/handle"
import { OMARCHY_URL } from "@/lib/links"
import { cn } from "@/lib/utils"
import type { View } from "@/lib/view"
import { OmarchyLogo } from "./OmarchyLogo"

type Props = {
  active: View
  onNavigate: (view: View) => void
}

/** The nav, in order. Every entry is a view on this site. */
const NAV: Array<{ view: View; label: string }> = [
  { view: "board", label: "Board" },
  { view: "stats", label: "Stats" },
  { view: "rules", label: "Rules" },
]

const ITEM = "inline-flex min-h-11 items-center hover:text-foreground"

export function SiteHeader({ active, onNavigate }: Props) {
  return (
    <div>
      <div className="-mx-4 flex h-9 items-center justify-center border-b border-card px-4 text-center text-[11px] text-muted-foreground sm:-mx-6 sm:text-xs">
        {/* One flex item: whitespace between flex items is dropped, which would eat the spaces around the links. */}
        <span>
          Community project · not affiliated with{" "}
          <a
            href={OMARCHY_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Omarchy
          </a>{" "}
          or{" "}
          <a
            href={xUrl("dhh")}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            DHH
          </a>
        </span>
      </div>

      <div className="flex h-[76px] items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate("board")}
          className="flex min-h-11 items-baseline gap-2"
          aria-label="time2omarchy home"
        >
          <span className="text-lg font-bold tracking-tight sm:text-xl">time2</span>
          <OmarchyLogo width={64} className="text-primary" fill="currentColor" />
        </button>
        {/* No `uppercase` here, though there was for a long time: Tailwind's
            preflight resets text-transform on `button`, so it never reached
            any of these and only shouted at the one item that is a link. */}
        <nav className="flex items-center gap-4 font-medium text-muted-foreground text-xs sm:gap-5">
          {NAV.map(({ view, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(view)}
              className={cn(ITEM, active === view && "text-foreground")}
              aria-current={active === view ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
