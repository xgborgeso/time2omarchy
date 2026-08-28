import type { ReactNode } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  value: ReactNode
  note?: ReactNode
  accent?: boolean
}

/**
 * One figure, in a Card like every other panel on the page.
 *
 * `accent` is a border and a text colour, nothing structural — the record is
 * the number people came for, so it is the one tile that stands out.
 */
export function StatTile({ label, value, note, accent }: Props) {
  return (
    <Card className={cn("gap-2 py-4", accent && "border-primary")}>
      <CardHeader className="px-4">
        <CardTitle className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p
          className={cn(
            "text-2xl font-bold leading-none tabular-nums sm:text-[34px]",
            accent ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </p>
        {note ? (
          <CardDescription className="mt-2 text-[11px]">{note}</CardDescription>
        ) : null}
      </CardContent>
    </Card>
  )
}
