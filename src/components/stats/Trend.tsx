"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
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
import type { DayCount } from "@/lib/stats"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function shortDay(day: string): string {
  const [, month, date] = day.split("-")
  return `${Number(date)} ${MONTHS[Number(month) - 1]}`
}

const config = {
  count: { label: "Ranked", color: "var(--chart-1)" },
} satisfies ChartConfig

export function Trend({ daily }: { daily: DayCount[] }) {
  const peak = Math.max(0, ...daily.map((d) => d.count))
  const data = daily.map((day) => ({ ...day, label: shortDay(day.day) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranked, last {daily.length} days</CardTitle>
        <CardDescription>peak {peak.toLocaleString()} in a day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[160px] w-full">
          <AreaChart accessibilityLayer data={data} margin={{ left: 16, right: 16 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              // Fourteen labels on a card this wide collide, so only the two
              // ends are drawn. Recharts drops an explicit first tick when it
              // sits on the axis origin; this keeps both.
              interval="preserveStartEnd"
              ticks={data.length > 1 ? [data[0]!.label, data.at(-1)!.label] : undefined}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="count"
              type="monotone"
              stroke="var(--color-count)"
              fill="var(--color-count)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
