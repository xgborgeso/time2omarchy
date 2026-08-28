import { SearchIcon, XIcon } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type Props = {
  value: string
  onChange: (next: string) => void
  /**
   * How many entries matched, or null while there is nothing to report.
   *
   * Null covers both "not searching" and "the answer is still on its way" —
   * typing is debounced, so for a moment the field holds a query no count
   * describes yet, and reporting one then is reporting on a request that has
   * not happened.
   */
  results?: number | null
  /**
   * The query the count is actually about.
   *
   * Not the field's value: mid-debounce those differ, and quoting the field
   * would attribute a count to a query that never ran.
   */
  term?: string
}

/**
 * The board's filter, in the shape a table's toolbar takes.
 *
 * It narrows the board rather than listing matches beside it. An earlier
 * version pinned results above the entries and hid any already visible, so
 * searching for a handle on the page you were looking at did nothing at all.
 */
export function BoardSearch({ value, onChange, results = null, term }: Props) {
  const settled = results !== null && term

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <p aria-live="polite" className="text-muted-foreground text-xs">
        {settled
          ? results === 0
            ? `No entry matches “${term}”`
            : `${results.toLocaleString()} ${results === 1 ? "entry" : "entries"} matching “${term}”`
          : null}
      </p>

      <InputGroup className="h-9 w-full sm:w-[16rem]">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search for a handle"
          aria-label="Search entries by handle"
          spellCheck={false}
          autoComplete="off"
        />
        {value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => onChange("")}
              aria-label="Clear the search"
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </div>
  )
}
