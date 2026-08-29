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
          <li className="pl-2">A boot screen is required, and shown publicly.</li>
          <li className="pl-2">
            Times are self-reported. The boot screen is the only check on that, and anyone
            can report one that does not look right.
          </li>
        </ol>
      </section>
    </div>
  )
}
