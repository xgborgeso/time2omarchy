"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TRPCProvider } from "@/lib/trpc"
import type { AppRouter } from "@/server/trpc/router"

export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state, not at module scope: a module-level client would be
  // shared across requests on the server and leak one user's data to another.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  )

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: "/api/trpc" })],
    }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
        <Toaster />
      </TRPCProvider>
    </QueryClientProvider>
  )
}
