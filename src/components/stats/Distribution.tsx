"use client"

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { axisPosition, type TimeBucket } from "@/lib/stats"
import { formatTime } from "@/lib/time"

type Props = {
  buckets: TimeBucket[]
  total: number
  medianSeconds: number | null
}

/**
 * One series, so no legend — the heading names it. Colour comes from the
 * theme's chart tokens rather than from anything set here.
 */
const config = {
  count: { label: "Installs", color: "var(--chart-1)" },
} satisfies ChartConfig

export function Distribution({ buckets, total, medianSeconds }: Props) {
  const busiest = buckets.reduce((a, b) => (b.count > a.count ? b : a), buckets[0]!)
  const median = medianSeconds != null ? axisPosition(medianSeconds, buckets) : null

  const data = buckets.map((bucket) => ({
    ...bucket,
    share: total > 0 ? Math.round((bucket.count / total) * 100) : 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install times</CardTitle>
        <CardDescription>
          {busiest.count > 0 ? `Most land in ${busiest.label}.` : "Nothing ranked yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[260px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ top: 16 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={0}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelKey="label"
                  formatter={(value, _name, item) => (
                    <span className="text-muted-foreground">
                      {Number(value).toLocaleString()}{" "}
                      {Number(value) === 1 ? "install" : "installs"} · {item.payload.share}%
                    </span>
                  )}
                />
              }
            />
            {/* The median sits between buckets, so it is drawn as a position
                along the axis rather than snapped to one of them. */}
            {median != null ? (
              <ReferenceLine
                x={
                  buckets[Math.min(buckets.length - 1, Math.floor(median * buckets.length))]
                    ?.label
                }
                stroke="var(--chart-2)"
                strokeDasharray="4 4"
                label={{
                  value: `median ${formatTime(medianSeconds as number)}`,
                  position: "top",
                  fill: "var(--chart-2)",
                  fontSize: 11,
                }}
              />
            ) : null}
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
