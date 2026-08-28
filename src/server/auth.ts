/**
 * Sign in with X.
 *
 * Verification is an OAuth sign-in rather than a posted code: X hands over a
 * numeric account id, which is the one part of an account that survives a
 * rename. See `src/lib/identity.ts` for why that matters.
 */
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { userFromXProfile, type XProfile } from "../lib/identity"
import { getDb } from "./db"
import * as schema from "./schema"

/**
 * Extra columns on Better Auth's own `user` table.
 *
 * Exported because the schema in `schema.ts` has to match what Better Auth
 * expects exactly, and a test compares the two — a missing column only shows
 * up otherwise as a failed sign-in after someone has already authorised on X.
 */
export const USER_FIELDS = {
  /** The X handle, lowercased. `input: false` so no client can set it. */
  handle: { type: "string", required: true, input: false },
} as const

/**
 * X bills per resource read, so the profile is fetched exactly once.
 *
 * Better Auth's stock provider calls `/2/users/me` twice — a second time only
 * to look for an email address this app has no use for. Both are metered.
 */
async function fetchXProfile(accessToken: string) {
  const res = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  })
  // 402 here means the developer account is out of credits, not that the
  // person failed to sign in — both end the same way, unverified.
  if (!res.ok) return null
  return (await res.json()) as XProfile
}

function build(db: Awaited<ReturnType<typeof getDb>>) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    // Nothing here signs in with a password; X is the only door.
    emailAndPassword: { enabled: false },
    user: { additionalFields: USER_FIELDS },
    socialProviders: {
      twitter: {
        clientId: process.env.TWITTER_CLIENT_ID ?? "",
        clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
        // Only what a leaderboard needs to know. The defaults also ask for
        // `users.email` and `offline.access`; this app never reads an email
        // and never calls X again after sign-in, so neither is worth the
        // extra line on someone's consent screen.
        disableDefaultScope: true,
        scope: ["users.read", "tweet.read"],
        getUserInfo: async (token) => {
          if (!token.accessToken) return null
          const profile = await fetchXProfile(token.accessToken)
          const user = profile && userFromXProfile(profile)
          if (!profile || !user) return null
          return { user, data: profile }
        },
      },
    },
  })
}

/** Inferred from the config, so the client can read `user.handle` off it. */
export type Auth = ReturnType<typeof build>

let cached: Promise<Auth> | null = null

/**
 * Async because the database is: PGlite opens and migrates before it can be
 * handed to an adapter. Cached, so that happens once per process.
 */
export function getAuth(): Promise<Auth> {
  if (!cached) {
    cached = getDb()
      .then(build)
      .catch((err) => {
        cached = null
        throw err
      })
  }
  return cached
}
