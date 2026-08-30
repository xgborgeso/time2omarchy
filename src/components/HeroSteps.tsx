/**
 * What ranking costs, before anybody presses anything.
 *
 * The hero said what the board *is* and never what to *do*, so the only place
 * the flow was written down was the rules page — which you reach by choosing
 * to go looking for it. Most people who bounce never learn that ranking takes
 * a photo they already have and about a minute.
 *
 * Three actions, not four. Landing on the board is the outcome rather than
 * something you do, and naming it as a step made the row longer without
 * telling anyone anything.
 */

import { ChevronRightIcon } from "lucide-react"

/** The 𝕏 in the middle step is U+1D54F, not the logo: no asset, no layout shift. */
const STEPS = [
  { icon: "📸", label: "Snap your boot screen" },
  { icon: "𝕏", label: "Sign in with X" },
  { icon: "✍️", label: "Add your time and machine" },
] as const

export function HeroSteps() {
  return (
    <ol
      /**
       * A row that becomes a list. Wrapping three items mid-row leaves an
       * arrow stranded at the end of a line, so below `sm` the separators go
       * and the steps stack left-aligned — a deliberate list rather than a
       * squeezed row.
       */
      className="mx-auto mt-7 flex w-max flex-col items-start gap-2 text-[13px] text-muted-foreground sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3 sm:gap-y-2"
    >
      {STEPS.map((step, i) => (
        <li key={step.label} className="flex items-center gap-2 whitespace-nowrap">
          {/* Between items, never before the first, and gone once stacked. */}
          {i > 0 ? (
            <ChevronRightIcon
              aria-hidden="true"
              // Drawn, not typed. The "→" character renders at whatever weight
              // the font gives it, which beside 13px text is a faint smudge.
              className="hidden size-3.5 shrink-0 text-border sm:inline-block"
            />
          ) : null}
          <span aria-hidden="true" className="w-[1.1em] text-center">
            {step.icon}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  )
}
