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
import { captureError } from "./report"
import * as schema from "./schema"

/**
 * Extra columns on Better Auth's own `user` table.
 *
 * Exported because the schema in `schema.ts` has to match what Better Auth
 * expects exactly, and a test compares the two — a missing column only shows
 * up otherwise as a failed sign-in after someone has already authorised on X.
 */
export const USER_FIELDS = {
  /**
   * The X handle, lowercased, taken from the profile at sign-up.
   *
   * Ordinary input rather than `input: false`, because Better Auth filters
   * `input: false` fields out of the provider profile as well — the value
   * would never arrive and creation would fail on a required field it just
   * discarded. `refuseHandleChange` is what stops it moving afterwards.
   */
  handle: { type: "string", required: true },
} as const

/**
 * The handle decides who owns an entry, so it may only ever come from X.
 *
 * Better Auth has no "set once" for a field: anything the provider can supply,
 * a signed-in client can also send to `updateUser`. Left open, changing your
 * handle to a stranger's would be enough to verify their entry, so every update
 * has it stripped — sign-up is the only way in.
 */
export async function refuseHandleChange(data: Record<string, unknown>) {
  const { handle: _ignored, ...rest } = data
  return { data: rest }
}

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

  if (!res.ok) {
    // 402 is the one worth naming: the developer account is out of credits,
    // so every verify fails at the last step, after the person has already
    // approved on X. It looks exactly like a bug until someone reads this.
    await captureError(
      new Error(
        res.status === 402
          ? "X API credits exhausted — verifies cannot complete until the developer account is funded."
          : `X profile lookup failed: ${res.status}`,
      ),
    )
    return null
  }

  return (await res.json()) as XProfile
}

function build(db: Awaited<ReturnType<typeof getDb>>) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    // Nothing here signs in with a password; X is the only door.
    emailAndPassword: { enabled: false },
    /**
     * Ninety days, up from Better Auth's seven.
     *
     * Every expiry costs a metered `/2/users/me` call at a cent apiece — the
     * only thing X charges this app for — so the session length is a bill, not
     * just a convenience. Someone who ranks in January and comes back in March
     * to beat their own time should not cost another authentication.
     *
     * The trade is a longer window on a borrowed machine. There is no signed-in
     * state to see or sign out of, so the exposure is that the next person at
     * that browser could rank as them; the entry itself cannot be taken.
     */
    session: {
      expiresIn: 60 * 60 * 24 * 90,
      // Refreshed a day at a time rather than on every request, so an active
      // person's session keeps sliding without a write per page view.
      updateAge: 60 * 60 * 24,
    },
    user: { additionalFields: USER_FIELDS },
    databaseHooks: {
      user: { update: { before: refuseHandleChange } },
    },
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
