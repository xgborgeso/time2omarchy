"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Activity } from "@/components/Activity"
import { Board } from "@/components/Board"
import { BoardPager } from "@/components/BoardPager"
import { BoardSearch } from "@/components/BoardSearch"
import { Footer } from "@/components/Footer"
import { Hero } from "@/components/Hero"
import { Lightbox } from "@/components/Lightbox"
import { RankDialog } from "@/components/RankDialog"
import { RulesPage } from "@/components/RulesPage"
import { SiteHeader } from "@/components/SiteHeader"
import { StatsPage } from "@/components/stats/StatsPage"
import { consumeAuthError } from "@/lib/auth-error"
import { useTRPC } from "@/lib/trpc"
import type { BoardEntry, RankSuccess } from "@/lib/types"
import { useDebounced } from "@/lib/use-debounced"
import { hashForView, type View, viewFromHash } from "@/lib/view"

export function App() {
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery(
    trpc.board.queryOptions(
      { page },
      // Only the first page is live. Deeper pages would reshuffle under
      // someone mid-read for entries they are not watching anyway.
      { refetchInterval: page === 1 ? 10_000 : false, placeholderData: (p) => p },
    ),
  )
  const report = useMutation(trpc.report.mutationOptions())
  /**
   * Handles this viewer has already flagged, so the button can go quiet.
   *
   * Held for the session only. The server dedupes for real; this exists so a
   * second press does not look like it did nothing.
   */
  const [reported, setReported] = useState<string[]>([])
  const [open, setOpen] = useState<BoardEntry | null>(null)
  /** A handle searched for, because this page may not be the one holding it. */
  const [lookup, setLookup] = useState("")
  // Debounced so a typed handle costs one query, not one per keystroke.
  const searched = useDebounced(lookup.trim(), 300)
  const { data: matches, isFetching: searchPending } = useQuery({
    ...trpc.search.queryOptions({ query: searched }),
    // The server ignores anything shorter; no reason to ask it twice.
    enabled: searched.replace(/^@+/, "").length >= 2,
    // Keep the last results on screen while the next load, so a keystroke
    // does not blank the board between characters.
    placeholderData: (previous) => previous,
  })

  /** A search replaces the board with its results, the way a table filters. */
  const searching = searched.replace(/^@+/, "").length >= 2

  const [view, setView] = useState<View>("board")

  /**
   * Says why the trip to X came back empty.
   *
   * Runs once, before anything else can navigate: the reason arrives as a
   * query parameter and is dropped from the url straight after, so a reload
   * does not repeat it.
   */
  useEffect(() => {
    const failure = consumeAuthError()
    if (failure) toast.error(failure)
  }, [])

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
   * Flags a boot screen.
   *
   * Answered the same way whatever happened: a report that is refused, or
   * already on file, still ends with the person having done the thing they
   * pressed the button to do, and telling them otherwise only invites a retry.
   */
  async function onReport(entry: BoardEntry) {
    setReported((current) =>
      current.includes(entry.handle) ? current : [...current, entry.handle],
    )
    const result = await report.mutateAsync({ handle: entry.handle }).catch(() => null)
    if (result && !result.ok) {
      toast.error(result.error)
      setReported((current) => current.filter((handle) => handle !== entry.handle))
      return
    }
    toast.success("Reported. Someone will take a look.")
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
    // The mutation already returned the first page, so seed it rather than
    // making every client refetch what it was just handed. Anyone reading a
    // later page is sent back to the top, where their own entry now is.
    queryClient.setQueryData(trpc.board.queryKey({ page: 1 }), result.board)
    setPage(1)
    void queryClient.invalidateQueries(trpc.stats.queryFilter())
  }

  const entries = data?.entries ?? []
  // One list: the search narrows the board rather than sitting beside it.
  const shownEntries = searching ? (matches ?? []) : entries

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-10 sm:px-6">
      <SiteHeader active={view} onNavigate={navigate} />

      <main className="flex-1">
        {view === "stats" ? (
          <StatsPage />
        ) : view === "rules" ? (
          <>
            <RulesPage />
            {/* Same component as the board's, so the sign-in, the form and the
                result card are all one flow. Ranking from here lands you on
                the board, because that is where the entry you just made is. */}
            <RankDialog
              onSuccess={(result) => {
                onSuccess(result)
                navigate("board")
              }}
            />
          </>
        ) : (
          <>
            <Hero counters={data?.counters} />
            <RankDialog onSuccess={onSuccess} />

            {/* Flush with the board's own frame, not with an entry's inner
                padding: the rule beneath it is the edge the eye measures
                against, and stopping short of it reads as misalignment. */}
            <div className="mt-12 mb-3 sm:mt-16">
              <BoardSearch
                value={lookup}
                onChange={setLookup}
                // Reported only once the answer has landed: mid-debounce the
                // field holds a query no count describes yet.
                term={searched}
                results={searching && !searchPending ? shownEntries.length : null}
              />
            </div>

            <Board
              entries={shownEntries}
              loading={isLoading && !searching}
              onOpen={setOpen}
            />

            {/* Paging is about the whole board; a set of results is not paged. */}
            {searching ? null : (
              <BoardPager
                page={data?.page ?? 1}
                perPage={data?.perPage ?? 0}
                total={data?.total ?? 0}
                onPage={(next) => {
                  setPage(next)
                  window.scrollTo({ top: 0 })
                }}
              />
            )}

            {shownEntries.length === 0 && !isLoading ? (
              <p className="border-y border-card py-10 text-center text-sm text-muted-foreground">
                {searching
                  ? "No entry matches that handle."
                  : "Nothing ranked yet. Be first."}
              </p>
            ) : null}
            <Activity items={data?.activity ?? []} onStats={() => navigate("stats")} />
          </>
        )}
      </main>

      <Footer onNavigate={navigate} />

      <Lightbox
        entry={open}
        onClose={() => setOpen(null)}
        reported={open ? reported.includes(open.handle) : false}
        onReport={onReport}
      />
    </div>
  )
}
