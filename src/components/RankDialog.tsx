"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RankForm } from "@/components/RankForm"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { signIn } from "@/lib/auth-client"
import { useTRPC } from "@/lib/trpc"
import type { RankSuccess } from "@/lib/types"

type Props = {
  onSuccess: (result: RankSuccess) => void
}

/**
 * The rank form, behind X.
 *
 * The gate is here rather than inside the form on purpose. Going to X is a
 * page navigation, and a `File` cannot survive one — so anyone who filled the
 * form first would come back to an empty file picker. Asking before there is
 * anything to lose is the only order that works.
 *
 * It also means nothing reaches storage without an account behind it: the
 * upload endpoint requires the same session this opens.
 *
 * Deliberately not closed on success: the result carries the share button, and
 * that moment is the whole point of ranking.
 */
export function RankDialog({ onSuccess }: Props) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const [going, setGoing] = useState(false)
  const { data: me, isLoading } = useQuery(trpc.me.queryOptions())

  /**
   * Reopens the form after the trip to X.
   *
   * The redirect reloads the page, so the click that started this is gone.
   * The marker is dropped from the url straight away, or a reload months
   * later would pop the form open for no reason.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has("rank")) return
    params.delete("rank")
    const query = params.toString()
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
    )
    setOpen(true)
  }, [])

  async function start() {
    if (me?.handle) {
      setOpen(true)
      return
    }
    setGoing(true)
    const result = await signIn.social({
      provider: "twitter",
      // Straight back to the board with the form open, so approving on X lands
      // where the button was pressed rather than at the top of the page.
      callbackURL: "/?rank=1",
      errorCallbackURL: "/",
    })
    if (result?.error) {
      setGoing(false)
      toast.error(result.error.message ?? "Could not reach X. Try again.")
    }
  }

  return (
    <div className="mt-8 flex justify-center">
      <Button
        onClick={start}
        disabled={isLoading || going}
        className="h-11 px-8 font-bold text-sm uppercase"
      >
        {going ? "Opening X…" : "Rank your install"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              Rank your install{me?.handle ? ` as @${me.handle}` : ""}
            </DialogTitle>
            {/* The form says the one thing worth saying, under its own button.
                Repeating it here was the same sentence twice on one screen. */}
            <DialogDescription className="sr-only">
              Your time, the machine it ran on, and the boot screen.
            </DialogDescription>
          </DialogHeader>
          <RankForm onSuccess={onSuccess} className="w-full" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
