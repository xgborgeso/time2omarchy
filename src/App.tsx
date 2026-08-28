"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import { Activity } from "@/components/Activity"
import { Board } from "@/components/Board"
import { Footer } from "@/components/Footer"
import { Hero } from "@/components/Hero"
import { Lightbox } from "@/components/Lightbox"
import { RankForm } from "@/components/RankForm"
import { RulesPage } from "@/components/RulesPage"
import { SiteHeader } from "@/components/SiteHeader"
import { StatsPage } from "@/components/stats/StatsPage"
import { signIn, useSession } from "@/lib/auth-client"
import { useTRPC } from "@/lib/trpc"
import type { BoardEntry, RankSuccess } from "@/lib/types"
import { usePresence } from "@/lib/use-presence"
import { hashForView, type View, viewFromHash } from "@/lib/view"

export function App() {
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  usePresence()
  const { data, isLoading } = useQuery(
    trpc.board.queryOptions(undefined, { refetchInterval: 10_000 }),
  )
  const { data: session } = useSession()
  const signedInHandle = session?.user.handle ?? null
  const claim = useMutation(trpc.claim.mutationOptions())
  const [open, setOpen] = useState<BoardEntry | null>(null)
  const [view, setView] = useState<View>("board")

  const applyHash = useCallback(() => {
    setView(viewFromHash(window.location.hash))
  }, [])

  useEffect(() => {
    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
  }, [applyHash])

  // Landing on a new view mid-scroll from the board is disorienting.
  // biome-ignore lint/correctness/useExhaustiveDependencies: view is the trigger, not a value read inside
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  /**
   * Taking over a row ranked as a guest.
   *
   * Signed out this can only start the sign-in — the row's handle is not proof
   * of anything, so the server is never told which row to claim. It works out
   * ownership from the session alone once there is one.
   */
  async function onClaim() {
    if (!signedInHandle) {
      await signIn.social({ provider: "twitter", callbackURL: "/", errorCallbackURL: "/" })
      return
    }
    const result = await claim.mutateAsync().catch(() => null)
    if (result?.ok) {
      await queryClient.invalidateQueries({ queryKey: trpc.board.queryKey() })
    }
  }

  function navigate(next: View) {
    const hash = hashForView(next)
    if (hash) {
      window.location.hash = hash
      return
    }
    // No hash for the board, so replace rather than push an empty fragment.
    history.replaceState(null, "", window.location.pathname + window.location.search)
    setView("board")
  }

  function onSuccess(result: RankSuccess) {
    // The mutation already returned the new board, so seed it rather than
    // making every client refetch what it was just handed.
    queryClient.setQueryData(trpc.board.queryKey(), result.board)
    void queryClient.invalidateQueries(trpc.stats.queryFilter())
  }

  const entries = data?.entries ?? []

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-10 sm:px-6">
      <SiteHeader active={view} onNavigate={navigate} />

      <main className="flex-1">
        {view === "stats" ? (
          <StatsPage />
        ) : view === "rules" ? (
          <RulesPage />
        ) : (
          <>
            <Hero counters={data?.counters} />
            <RankForm onSuccess={onSuccess} entries={entries} />
            <Board
              entries={entries}
              loading={isLoading}
              onOpen={setOpen}
              signedInHandle={signedInHandle}
              onClaim={onClaim}
            />
            {entries.length === 0 && !isLoading ? (
              <p className="border-y border-card py-10 text-center text-sm text-muted-foreground">
                Nothing ranked yet. Be first.
              </p>
            ) : null}
            <Activity items={data?.activity ?? []} onStats={() => navigate("stats")} />
          </>
        )}
      </main>

      <Footer onNavigate={navigate} />

      <Lightbox entry={open} onClose={() => setOpen(null)} />
    </div>
  )
}
