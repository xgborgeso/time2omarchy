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
            Equal times share a rank, and a claimed entry is listed first. That is the only
            thing claiming changes about the order.
          </li>
          <li className="pl-2">One entry per X handle.</li>
          <li className="pl-2">A boot screen is required, shown publicly as proof.</li>
          <li className="pl-2">
            Times are self-reported. Anyone can rank — claiming your entry with X is
            optional, and earns the check mark.
          </li>
          <li className="pl-2">
            Only a claimed handle can post a faster time later. Claim yours whenever you
            like: your time and boot screen stay exactly as they are.
          </li>
          <li className="pl-2">
            The number at the top of the page is the fastest claimed time. Anyone can hold
            rank 1, but a headline needs an account standing behind it.
          </li>
        </ol>
      </section>
    </div>
  )
}
