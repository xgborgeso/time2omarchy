/**
 * What to say when the trip to X came back without a session.
 *
 * Better Auth redirects to `errorCallbackURL` with `?error=` and often
 * `?error_description=` attached, and until now nothing read them. The person
 * approved on X, landed back on the board, and saw nothing at all — which
 * reads as a broken button rather than a failure with a cause.
 *
 * One sentence, whatever the cause. The codes are real and distinguishable —
 * `unable_to_get_user_info` when X refuses the profile lookup, the `state_*`
 * family when a sign-in sat too long, `access_denied` when it was declined —
 * but each phrasing is a guess about what someone was doing, and a wrong guess
 * is worse than a plain sentence. Any of them mean the same thing to the
 * person: it did not work, and nothing was ranked.
 *
 * The specific code still reaches the server logs through `captureError`, so
 * nothing is lost for whoever has to fix it.
 */

const MESSAGE = "Could not finish signing in with X. Try again in a moment."

export type AuthError = { message: string; code: string } | null

export function authErrorFrom(search: string): AuthError {
  const params = new URLSearchParams(search)
  const code = params.get("error")
  if (!code) return null

  // Carried for the caller to log, never for the toast.
  return { message: MESSAGE, code }
}
