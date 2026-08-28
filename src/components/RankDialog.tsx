"use client"

import { useState } from "react"
import { RankForm } from "@/components/RankForm"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { RankSuccess } from "@/lib/types"

type Props = {
  onSuccess: (result: RankSuccess) => void
}

/**
 * The rank form, behind one button.
 *
 * Six required fields is most of a screen, and inline it pushed the board —
 * the thing people came for — below the fold. A leaderboard should show the
 * leaders first; submitting is what you do after seeing the time to beat.
 *
 * Deliberately not closed on success: the result carries the share button and
 * the offer to claim the entry, and that moment is the whole point of ranking.
 */
export function RankDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-8 flex justify-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="h-11 px-8 text-sm font-bold uppercase">
            Rank your install
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Rank your install</DialogTitle>
            {/* The form says the one thing worth saying, under its own button.
                Repeating it here was the same sentence twice on one screen. */}
            <DialogDescription className="sr-only">
              Your handle, your time, the machine it ran on, and the boot screen.
            </DialogDescription>
          </DialogHeader>
          <RankForm onSuccess={onSuccess} className="w-full" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
