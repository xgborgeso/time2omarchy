"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Activity } from "@/components/Activity"
import { Board } from "@/components/Board"
import { BoardPager } from "@/components/BoardPager"
import { Footer } from "@/components/Footer"
import { Hero } from "@/components/Hero"
import { Lightbox } from "@/components/Lightbox"
import { RankDialog } from "@/components/RankDialog"
import { RulesPage } from "@/components/RulesPage"
import { SiteHeader } from "@/components/SiteHeader"
import { StatsPage } from "@/components/stats/StatsPage"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth-client"
import { claimOutcome } from "@/lib/claim-outcome"
import { useTRPC } from "@/lib/trpc"
import type { BoardEntry, RankSuccess } from "@/lib/types"
import { useDebounced } from "@/lib/use-debounced"
import { usePresence } from "@/lib/use-presence"
import { hashForView, type View, viewFromHash } from "@/lib/view"

export function App() {
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  usePresence()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery(
    trpc.board.queryOptions(
      { page },
      // Only the first page is live. Deeper pages would reshuffle under
      // someone mid-read for entries they are not watching anyway.
      { refetchInterval: page === 1 ? 10_000 : false, placeholderData: (p) => p },
    ),
  )
  const claim = useMutation(trpc.claim.mutationOptions())
  const [open, setOpen] = useState<BoardEntry | null>(null)
  /** A handle looked up because the board's top hundred does not contain it. */
  const [lookup, setLookup] = useState("")
  const searched = useDebounced(lookup.trim().replace(/^@+/, "").toLowerCase(), 300)
  const shown = new Set((data?.entries ?? []).map((e) => e.handle))
  const { data: found } = useQuery({
    ...trpc.entry.queryOptions({ handle: searched }),
    // Only worth asking for what the board is not already showing.
    enabled: searched.length > 0 && !shown.has(searched),
  })

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
   * Proving an entry, which is the only thing X is used for here.
   *
   * The handle rides along in the return url rather than in state: the round
   * trip through X reloads the page, so anything held in memory is gone by the
   * time the answer comes back.
   */
  async function onClaim(entry: BoardEntry) {
    await signIn.social({
      provider: "twitter",
      callbackURL: `/?claim=${encodeURIComponent(entry.handle)}`,
      errorCallbackURL: "/",
    })
  }

  /**
   * Finishes a claim that went through X and came back.
   *
   * Guarded by a ref, not by the effect's dependencies: the mutation object
   * changes identity on every render, so depending on it fired the claim in a
   * loop until the rate limit answered instead of the server.
   */
  const claimed = useRef<string | null>(null)

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("claim")
    if (!target || claimed.current === target) return
    claimed.current = target
    // Dropped straight away so a reload never repeats the claim.
    window.history.replaceState(null, "", window.location.pathname + window.location.hash)

    void claim
      .mutateAsync({ handle: target })
      .catch(() => null)
      .then(async (result) => {
        const outcome = claimOutcome(target, result)
        if (outcome.ok) {
          toast.success(outcome.message)
          // Every page, not one: the claimed entry may sit on any of them.
          await queryClient.invalidateQueries(trpc.board.queryFilter())
        } else {
          // No title above it: "that claim did not go through" says nothing
          // the sentence below it does not already say better.
          toast.error(outcome.message)
        }
      })
    // Runs once per handle in the url; the ref above is the real guard.
  }, [claim, queryClient, trpc])

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
    // The mutation already returned the first page, so seed it rather than
    // making every client refetch what it was just handed. Anyone reading a
    // later page is sent back to the top, where their own entry now is.
    queryClient.setQueryData(trpc.board.queryKey({ page: 1 }), result.board)
    setPage(1)
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
            <RankDialog onSuccess={onSuccess} />

            {/* The board shows the top hundred. Past that, this is the only
                way someone reaches their own entry — or claims it. */}
            <div className="mx-auto mt-10 flex w-full max-w-[792px] justify-end">
              <Input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="Find a handle"
                aria-label="Find an entry by handle"
                className="h-9 w-full max-w-[14rem] text-sm"
              />
            </div>
            <Board
              entries={entries}
              loading={isLoading}
              onOpen={setOpen}
              onClaim={onClaim}
              found={searched && !shown.has(searched) ? found : null}
            />
            <BoardPager
              page={data?.page ?? 1}
              perPage={data?.perPage ?? 0}
              total={data?.total ?? 0}
              onPage={(next) => {
                setPage(next)
                window.scrollTo({ top: 0 })
              }}
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
