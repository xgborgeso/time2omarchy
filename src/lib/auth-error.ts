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
 * The code is deliberately not returned. It would have nowhere to go but the
 * browser console, where it is an internal detail in front of whoever opens
 * devtools and tells a fix nothing — the server already logged the real cause,
 * which is more specific than the code anyway.
 */

const MESSAGE = "Could not finish signing in with X. Try again in a moment."

export type AuthError = { message: string } | null

export function authErrorFrom(search: string): AuthError {
  const params = new URLSearchParams(search)
  const code = params.get("error")
  if (!code) return null

  return { message: MESSAGE }
}

/**
 * Reads the failure off the url and clears it, in one step.
 *
 * Together rather than separately because they must not come apart: a reason
 * that is read but not cleared reappears on every reload, and one cleared but
 * not read is a silent failure again. Returns the sentence to show, or null
 * when the trip went fine.
 *
 * Nothing is logged. The server already wrote the real cause, which is more
 * specific than the code, and a console line here would only put an internal
 * detail in front of whoever opens devtools.
 */
export function consumeAuthError(): string | null {
  const failure = authErrorFrom(window.location.search)
  if (!failure) return null

  const params = new URLSearchParams(window.location.search)
  params.delete("error")
  params.delete("error_description")
  const query = params.toString()
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
  )

  return failure.message
}
