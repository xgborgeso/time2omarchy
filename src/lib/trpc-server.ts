/**
 * Server-side tRPC, used to prefetch on the server so the first paint already
 * has data — and so crawlers see a real board rather than an empty shell.
 *
 * The options proxy matters: it produces the same query keys the client's
 * `useTRPC()` does, which is what lets the dehydrated cache hydrate instead of
 * refetching.
 */
import { QueryClient } from "@tanstack/react-query"
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query"
import { cache } from "react"
import { appRouter } from "@/server/trpc/router"

/** One client per request, shared by everything rendering in it. */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: 1, refetchOnWindowFocus: false },
      },
    }),
)

export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  queryClient: getQueryClient,
  // The prerender has no visitor: this page is generated once per
  // revalidation, not once per person. Nothing prefetched here reads the
  // context — recording a visit is the client's job now, via `visit`.
  ctx: {
    headers: new Headers(),
    resHeaders: new Headers(),
    secure: true,
    // A prerender is one render per revalidation, not one per caller: it has
    // no address to throttle and nothing to throttle it against.
    clientKey: "prerender",
  },
})
