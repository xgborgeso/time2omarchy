"use client"

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
import { cpuById, cpuLabel, cpusByVendor } from "@/lib/cpus"
import { RAM_OPTIONS, type Specs, STORAGE } from "@/lib/specs"
import { cn } from "@/lib/utils"

type Props = {
  value: Specs
  onChange: (next: Specs) => void
}

const NEW_CPU_ISSUE =
  "https://github.com/xgborgeso/time2omarchy/issues/new?title=Add%20CPU:%20"

/**
 * Optional hardware.
 *
 * Chosen from lists rather than typed, because the whole reason to collect
 * this is to aggregate it — free text cannot answer "average install on a
 * Ryzen 9". Everything here is optional; nothing may block ranking.
 */
export function SpecsFields({ value, onChange }: Props) {
  const cpuId = useId()
  const ramId = useId()
  const storageId = useId()
  const [open, setOpen] = useState(false)

  const selected = value.cpuId ? cpuById(value.cpuId) : null

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={cpuId} className="text-xs text-muted-foreground">
          CPU
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={cpuId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-11 justify-between font-normal"
            >
              <span className={cn("truncate", !selected && "text-muted-foreground")}>
                {selected ? cpuLabel(selected) : "Any"}
              </span>
              <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search CPUs…" />
              <CommandList>
                <CommandEmpty>
                  <span className="text-xs">
                    Not listed?{" "}
                    <a
                      href={NEW_CPU_ISSUE}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      Ask for it on GitHub
                    </a>
                  </span>
                </CommandEmpty>
                {cpusByVendor().map((group) => (
                  <CommandGroup key={group.vendor} heading={group.vendor}>
                    {group.cpus.map((cpu) => (
                      <CommandItem
                        key={cpu.id}
                        value={cpuLabel(cpu)}
                        onSelect={() => {
                          // Selecting the current chip clears it, so the field
                          // can be undone without reloading the page.
                          onChange({
                            ...value,
                            cpuId: cpu.id === value.cpuId ? null : cpu.id,
                          })
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ramId} className="text-xs text-muted-foreground">
          RAM
        </Label>
        <Select
          value={value.ramGb ? String(value.ramGb) : undefined}
          onValueChange={(next) => onChange({ ...value, ramGb: Number(next) })}
        >
          <SelectTrigger id={ramId} className="h-11 w-full">
            <SelectValue placeholder="Any" />
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
        <Label htmlFor={storageId} className="text-xs text-muted-foreground">
          Storage
        </Label>
        <Select
          value={value.storage ?? undefined}
          onValueChange={(next) => onChange({ ...value, storage: next })}
        >
          <SelectTrigger id={storageId} className="h-11 w-full">
            <SelectValue placeholder="Any" />
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
