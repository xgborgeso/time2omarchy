import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type Props = {
  page: number
  perPage: number
  total: number
  onPage: (page: number) => void
}

/**
 * Which page numbers to draw.
 *
 * Always the first and the last, always the current one and its neighbours,
 * and an ellipsis wherever that skips something. A board with forty pages
 * cannot show forty buttons, and the two numbers anyone actually wants are
 * "where I am" and "how far this goes".
 */
export function pageWindow(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)

  const around = [page - 1, page, page + 1].filter((n) => n > 1 && n < pages)
  const shown = [1, ...around, pages]

  const out: (number | "gap")[] = []
  for (const [i, n] of shown.entries()) {
    const previous = shown[i - 1]
    if (previous !== undefined && n - previous > 1) out.push("gap")
    out.push(n)
  }
  return out
}

/** How the count reads under the pager: "1–50 of 2,088". */
export function pageSummary(page: number, perPage: number, total: number): string {
  if (total === 0) return "Nothing ranked yet"
  const first = (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)
  return `${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`
}

export function BoardPager({ page, perPage, total, onPage }: Props) {
  const pages = perPage > 0 ? Math.ceil(total / perPage) : 0
  // One page is not a pager. The count still earns its place, though: it is
  // the only thing that says how big the board actually is.
  if (total === 0) return null

  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      {pages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPage(page - 1)}
                disabled={page <= 1}
                className="disabled:pointer-events-none disabled:opacity-40"
              />
            </PaginationItem>

            {pageWindow(page, pages).map((slot, i) =>
              slot === "gap" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: a gap has no identity beyond where it falls
                <PaginationItem key={`gap-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={slot}>
                  <PaginationLink
                    isActive={slot === page}
                    onClick={() => onPage(slot)}
                    aria-label={`Go to page ${slot}`}
                  >
                    {slot}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => onPage(page + 1)}
                disabled={page >= pages}
                className="disabled:pointer-events-none disabled:opacity-40"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <p className="text-xs text-muted-foreground tabular-nums">
        {pageSummary(page, perPage, total)}
      </p>
    </div>
  )
}
