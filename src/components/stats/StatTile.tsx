import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  value: ReactNode
  note?: ReactNode
  accent?: boolean
}

export function StatTile({ label, value, note, accent }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card px-4 py-4",
        accent ? "border-primary" : "border-border",
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold leading-none tabular-nums sm:text-[34px]",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {note ? <span className="text-[11px] text-muted-foreground">{note}</span> : null}
    </div>
  )
}
