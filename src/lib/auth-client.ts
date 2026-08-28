"use client"

import { inferAdditionalFields } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import type { Auth } from "@/server/auth"

/**
 * Type-only reference to the server instance, so `session.user.handle` is
 * known here without the server config reaching the browser bundle.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
})

export const { signIn, signOut, useSession } = authClient
