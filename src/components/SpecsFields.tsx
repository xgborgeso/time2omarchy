"use client"

import { useQuery } from "@tanstack/react-query"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Cpu, cpuLabel, cpusByVendor, OTHER_CPU_ID } from "@/lib/cpus"
import { NEW_CPU_ISSUE_URL } from "@/lib/links"
import { RAM_OPTIONS, type Specs, STORAGE } from "@/lib/specs"
import { useTRPC } from "@/lib/trpc"
import { useDebounced } from "@/lib/use-debounced"
import { cn } from "@/lib/utils"

type Props = {
  value: Specs
  onChange: (next: Specs) => void
}

/**
 * What the empty picker suggests typing.
 *
 * One chip per vendor, so none of the three reads as missing, and the ones
 * people actually run in 2026: the 9800X3D is the default enthusiast build,
 * Arrow Lake is Intel's current desktop line, M4 Pro the common Mac. They are
 * examples of how to search, not a shortlist — every one must return a hit.
 */
export const SEARCH_EXAMPLES = ["9800X3D", "Core Ultra 7", "M4 Pro"] as const

/** Matches the labels on the form above, so the two rows read as one form. */
const LABEL = "text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"

/**
 * One template for every field row in the rank form.
 *
 * Both rows share it so their column edges line up exactly — that alignment is
 * the whole difference between a form that looks designed and one that looks
 * like fields stacked until they fit.
 */
export const FIELD_ROW = "grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem_10.5rem]"

/**
 * Optional hardware.
 *
 * Chosen from a catalogue rather than typed, because the whole reason to
 * collect this is to aggregate it — free text cannot answer "average install
 * on a Ryzen 9". Everything here is optional; nothing may block ranking.
 */
export function SpecsFields({ value, onChange }: Props) {
  const cpuFieldId = useId()
  const ramId = useId()
  const storageId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const trpc = useTRPC()
  // Debounced so typing "7950x" costs one query, not five.
  const debounced = useDebounced(query, 200)
  const { data: results = [], isFetching } = useQuery({
    ...trpc.cpus.queryOptions({ query: debounced }),
    // The catalogue is a constant; there is nothing to go stale.
    staleTime: Number.POSITIVE_INFINITY,
    // Keep the previous list on screen while the next one loads, so the
    // popover does not flash empty between keystrokes.
    placeholderData: (previous: Cpu[] | undefined) => previous,
    // An empty box has nothing to answer, so the open costs no round trip.
    enabled: open && debounced.trim().length > 0,
  })

  // The chosen chip may not be in the current results, so remember it.
  const [selected, setSelected] = useState<Cpu | null>(null)

  return (
    <div className={FIELD_ROW}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={cpuFieldId} className={LABEL}>
          cpu
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={cpuFieldId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-11 justify-between font-normal"
            >
              <span className={cn("truncate", !value.cpuId && "text-muted-foreground")}>
                {selected
                  ? cpuLabel(selected)
                  : value.cpuId === OTHER_CPU_ID
                    ? "Other / not listed"
                    : "Choose a CPU"}
              </span>
              <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(24rem,90vw)] p-0" align="start">
            {/* The server already filtered; filtering again here would fight it. */}
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search CPUs…"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {/* The list opens empty on purpose: 227 chips is a wall
                    rather than a menu, and any opening selection is arbitrary
                    enough to read as the only chips there are. */}
                {!query.trim() && (
                  <p className="px-3 py-4 text-center text-muted-foreground text-xs">
                    Type to search — {SEARCH_EXAMPLES.join(", ")}…
                  </p>
                )}
                <CommandEmpty>
                  <span className="text-xs text-muted-foreground">
                    {isFetching ? "Searching…" : "No match."}
                  </span>
                </CommandEmpty>
                {cpusByVendor(results).map((group) => (
                  <CommandGroup key={group.vendor} heading={group.vendor}>
                    {group.cpus.map((cpu) => (
                      <CommandItem
                        key={cpu.id}
                        value={cpu.id}
                        onSelect={() => {
                          // Choosing the current chip clears it, so the field
                          // can be undone without reloading.
                          const next = cpu.id === value.cpuId ? null : cpu
                          setSelected(next)
                          onChange({ ...value, cpuId: next?.id ?? null })
                          setOpen(false)
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "size-4",
                            cpu.id === value.cpuId ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {cpu.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {/* Last, deliberately: it is the fallback, not the first
                    thing to reach for. The catalogue can never be complete,
                    and this field is required — without it an unlisted chip
                    would lock someone out of the board entirely. */}
                <CommandGroup>
                  <CommandItem
                    value={OTHER_CPU_ID}
                    onSelect={() => {
                      setSelected(null)
                      onChange({ ...value, cpuId: OTHER_CPU_ID })
                      setOpen(false)
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "size-4",
                        value.cpuId === OTHER_CPU_ID ? "opacity-100" : "opacity-0",
                      )}
                    />
                    Other / not listed
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
            {/* Outside CommandList on purpose: cmdk only renders CommandEmpty
                when nothing matches, and "Other" always does, so a link in
                there could never be seen. */}
            <div className="border-border border-t px-3 py-2">
              <a
                href={`${NEW_CPU_ISSUE_URL}${encodeURIComponent(query)}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
              >
                Didn't find your CPU? Ask for it on GitHub
              </a>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ramId} className={LABEL}>
          ram
        </Label>
        <Select
          value={value.ramGb ? String(value.ramGb) : undefined}
          onValueChange={(next) => onChange({ ...value, ramGb: Number(next) })}
        >
          <SelectTrigger id={ramId} className="!h-11 w-full">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {RAM_OPTIONS.map((gb) => (
              <SelectItem key={gb} value={String(gb)}>
                {gb} GB
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={storageId} className={LABEL}>
          storage
        </Label>
        <Select
          value={value.storage ?? undefined}
          onValueChange={(next) => onChange({ ...value, storage: next })}
        >
          <SelectTrigger id={storageId} className="!h-11 w-full">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {STORAGE.map((kind) => (
              <SelectItem key={kind.id} value={kind.id}>
                {kind.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
