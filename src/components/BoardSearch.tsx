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
  /** How many entries the current search matched, or null when not searching. */
  results: number | null
}

/**
 * The board's filter, in the shape a table's toolbar takes.
 *
 * It narrows the board rather than listing matches beside it. The earlier
 * version pinned results above the entries and hid any that were already
 * visible, so searching for a handle on the page you were looking at did
 * nothing at all — which is indistinguishable from broken.
 */
export function BoardSearch({ value, onChange, results }: Props) {
  const searching = value.trim().replace(/^@+/, "").length >= 2

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {searching
          ? results === 0
            ? `No entry matches “${value.trim()}”`
            : `${results?.toLocaleString()} ${results === 1 ? "entry" : "entries"} matching “${value.trim()}”`
          : null}
      </p>

      <InputGroup className="h-9 w-full sm:w-[16rem]">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search handles"
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
