"use client"

import { createTRPCContext } from "@trpc/tanstack-react-query"
// Type-only: the router's implementation must never reach the client bundle.
import type { AppRouter } from "@/server/trpc/router"

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()
