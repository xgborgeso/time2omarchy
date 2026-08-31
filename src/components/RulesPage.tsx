import { TIMING_LOG } from "@/lib/recover"

/**
 * Plain prose in a native ordered list: the browser draws and aligns the
 * numbers, so adding, reordering or expanding a rule is a one-line edit. If
 * this grows into a FAQ, each <li> takes a heading and a paragraph as-is.
 */
export function RulesPage() {
  return (
    <div className="mt-8 flex flex-col gap-3.5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[26px]">Rules</h1>
        <p className="mt-1.5 text-[13px] font-light text-muted-foreground">
          How a time gets on the board.
        </p>
      </div>

      <section className="mt-3 rounded-lg border border-border bg-card px-6 py-5 sm:px-8 sm:py-6">
        <ol className="ml-5 list-decimal space-y-3.5 text-sm marker:tabular-nums marker:text-muted-foreground">
          <li className="pl-2">Rank is by time alone. Fastest wins.</li>
          <li className="pl-2">
            Equal times share a rank. The earlier entry is listed first.
          </li>
          <li className="pl-2">
            Ranking goes through X. Every entry has an account behind it, so a handle here
            is never just a name someone typed.
          </li>
          <li className="pl-2">
            One entry per account. Only you can change your entry — beat your own time and
            it replaces the old one.
          </li>
          {/* "Boot screen" stopped being literally true once a terminal
              screenshot became acceptable. Widened here rather than renamed in
              the schema: bootScreenUrl and friends still describe the common
              case, and a migration would buy nothing a sentence cannot.

              This is also the last rule now. Self-reporting used to be spelled
              out after it, but saying "anyone can report you" was the last
              thing read before the button — a warning where an invitation
              belongs, about a control the lightbox already offers in plain
              sight. Five rules that say how to take part beat six that end on
              suspicion. */}
          <li className="pl-2">
            A screenshot is required, and shown publicly — your boot screen, or{" "}
            <code className="text-[13px]">{TIMING_LOG}</code> if you missed it.
          </li>
        </ol>
      </section>

      {/* The page used to stop here, which made it a dead end: this is where
          somebody goes to find out how to take part, and the answer was to
          work out for themselves that they had to go back to the board. The
          button itself is rendered by App, so there is one rank flow rather
          than two. */}
      <p className="mt-6 text-center text-[13px] font-light text-muted-foreground">
        That&rsquo;s all of it. Screenshot ready?
      </p>
    </div>
  )
}
