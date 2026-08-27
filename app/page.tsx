import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { App } from "@/App"
import { getQueryClient, trpc } from "@/lib/trpc-server"

/**
 * Regenerated at most once a minute and served from the CDN in between.
 *
 * A leaderboard is read far more than it is written, so paying to render this
 * per request buys nothing: live visitors get fresh data from the client's own
 * 10s polling, and everyone else — crawlers, first paints, shared links — gets
 * static HTML with the board already in it.
 */
export const revalidate = 60

export default async function Page() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery(trpc.board.queryOptions())

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <App />
    </HydrationBoundary>
  )
}
