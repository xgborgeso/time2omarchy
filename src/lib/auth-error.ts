/**
 * What to say when the trip to X came back without a session.
 *
 * Better Auth redirects to `errorCallbackURL` with `?error=` and often
 * `?error_description=` attached, and until now nothing read them. The person
 * approved on X, landed back on the board, and saw nothing at all — which
 * reads as a broken button rather than a failure with a cause.
 *
 * Its own module so the wording is testable without a browser.
 */

/** Codes worth translating. Anything else falls back to a plain sentence. */
const KNOWN: Record<string, string> = {
  access_denied: "You cancelled that on X. Nothing was ranked.",
  invalid_origin: "The sign-in came back to an address X does not trust.",
}

export type AuthError = { message: string } | null

export function authErrorFrom(search: string): AuthError {
  const params = new URLSearchParams(search)
  const code = params.get("error")
  if (!code) return null

  const known = KNOWN[code]
  if (known) return { message: known }

  // The description is X's or Better Auth's own words. Preferred over the
  // code, which is written for logs rather than for people.
  const described = params.get("error_description")?.trim()
  return {
    message: described
      ? `Could not finish signing in with X: ${described}`
      : "Could not finish signing in with X. Try again in a moment.",
  }
}
