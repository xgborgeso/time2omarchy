"use client"

import { ChevronLeftIcon } from "lucide-react"
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Benchmark, CpuLevel, SpecBucket, SpecFilter } from "@/lib/benchmark"
import { formatTime } from "@/lib/time"

type Props = {
  hardware: Benchmark
  active: SpecFilter | null
  onFilter: (next: SpecFilter | null) => void
}

/** What the CPU card is titled at each depth. */
const CPU_TITLES: Record<CpuLevel, string> = {
  vendor: "By CPU",
  family: "By family",
  model: "By model",
}

/** The value used when nothing is chosen; Select has no empty item. */
const EVERYTHING = "all"

const config = {
  medianSeconds: { label: "Median", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * Install time against the hardware it ran on.
 *
 * The three specs are required on every entry precisely so this can exist: a
 * benchmark assembled from real installs, at a sample size no review could
 * gather on purpose. Median rather than mean, because one failing drive would
 * otherwise misdescribe every machine beside it.
 *
 * The charts only show; the Select is what narrows. Clicking a bar reads well
 * but a `<path>` cannot be tabbed to, and this is the page's main control.
 */
export function Hardware({ hardware, active, onFilter }: Props) {
  const { storage, cpu, cpuLevel, cpuParent, cpuUnlisted, ram } = hardware
  if (storage.length === 0 && cpu.length === 0 && ram.length === 0) return null

  type Group = {
    label: string
    dimension: SpecFilter["dimension"]
    buckets: SpecBucket[]
    /** What the chart cannot show, said under it. */
    note?: string
  }

  /** Every bucket on offer, grouped the way the charts are. */
  const groups: Group[] = (
    [
      { label: "By drive", dimension: "storage", buckets: storage },
      {
        label: CPU_TITLES[cpuLevel],
        dimension: cpuLevel,
        buckets: cpu,
        // Chips outside the catalogue are left out of this chart rather than
        // heaped into an "Other" bar that would out-measure real vendors while
        // describing no machine. Left out quietly, though, the chart would
        // claim to cover a board it does not — so it says how many it missed.
        note:
          cpuUnlisted > 0
            ? `${cpuUnlisted.toLocaleString()} install${cpuUnlisted === 1 ? "" : "s"} on a chip that is not in the list yet`
            : undefined,
      },
      { label: "By memory", dimension: "ram", buckets: ram },
    ] satisfies Group[]
  ).filter((group) => group.buckets.length > 0)

  /**
   * What the trigger says.
   *
   * Rendered rather than left to `SelectValue`: drilling swaps the CPU group
   * for the level below, so the item carrying the current value is gone from
   * the list and Radix has no label to resolve — the trigger went blank. The
   * breadcrumb knows the name in exactly that case.
   */
  const activeLabel = active
    ? (groups.flatMap((group) => group.buckets).find((bucket) => bucket.id === active.id)
        ?.label ??
      cpuParent?.label ??
      active.id)
    : null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm">Install time by hardware</h2>
          <p className="mt-1.5 font-light text-muted-foreground text-xs">
            Median of every ranked install. Choosing a CPU goes a level deeper.
          </p>
        </div>

        <Select
          value={active ? `${active.dimension}:${active.id}` : EVERYTHING}
          onValueChange={(value) => {
            if (value === EVERYTHING) return onFilter(null)
            const [dimension, ...rest] = value.split(":")
            onFilter({
              dimension: dimension as SpecFilter["dimension"],
              // Model ids carry no colon, but rejoining is free insurance.
              id: rest.join(":"),
            })
          }}
        >
          <SelectTrigger className="!h-9 w-full sm:w-[15rem]" aria-label="Narrow the stats">
            <SelectValue>{activeLabel ?? "All installs"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EVERYTHING}>All installs</SelectItem>
            {groups.map((group) => (
              <SelectGroup key={group.dimension}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.buckets.map((bucket) => (
                  <SelectItem key={bucket.id} value={`${group.dimension}:${bucket.id}`}>
                    {bucket.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {groups.map((group) => (
          <HardwareCard
            key={group.dimension}
            title={group.label}
            buckets={group.buckets}
            note={group.note}
            chosen={active?.dimension === group.dimension ? active.id : null}
            // Only the CPU card has anywhere to go back to.
            parent={group.dimension === cpuLevel ? cpuParent : null}
            onFilter={onFilter}
          />
        ))}
      </div>
    </section>
  )
}

type CardProps = {
  title: string
  buckets: SpecBucket[]
  chosen: string | null
  parent: Benchmark["cpuParent"]
  /** What this chart leaves out, if anything. */
  note?: string
  onFilter: (next: SpecFilter | null) => void
}

function HardwareCard({ title, buckets, chosen, parent, note, onFilter }: CardProps) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
          {parent ? parent.label : title}
        </CardTitle>
        {parent ? (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onFilter(null)}
              className="text-muted-foreground"
            >
              <ChevronLeftIcon />
              All CPUs
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={config}
          style={{ height: `${Math.max(96, buckets.length * 34)}px` }}
          className="w-full"
        >
          <BarChart
            accessibilityLayer
            data={buckets}
            layout="vertical"
            margin={{ left: 0, right: 12 }}
          >
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              // Wide enough for "Ryzen 9000" and "Ryzen 9 9950X" on one line;
              // at 72 they wrapped mid-name, which read as two labels.
              width={104}
              // SVG text takes its colour from `fill`, not from `color`, and
              // Recharts sets that as an attribute — so the token has to be
              // passed here or the labels keep the library's default grey.
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <XAxis dataKey="medianSeconds" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  /* v8 ignore start -- @preserve: Recharts calls this
                     only on a real hover, and happy-dom measures every
                     element as 0x0, so no chart is ever hovered. */
                  formatter={(value, _name, item) => (
                    <span className="text-muted-foreground">
                      {formatTime(Number(value))} median ·{" "}
                      {item.payload.entries.toLocaleString()} installs
                    </span>
                  )}
                />
              }
            />
            {/* v8 ignore stop */}
            <Bar dataKey="medianSeconds" radius={4} barSize={16}>
              {buckets.map((bucket) => (
                <Cell
                  key={bucket.id}
                  fill="var(--color-medianSeconds)"
                  // Dimmed only to show which bucket the page is describing.
                  // Sample size is not weighted in: the tooltip carries the
                  // install count, and a second signal for it was noise.
                  fillOpacity={chosen && chosen !== bucket.id ? 0.4 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {note ? (
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{note}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
