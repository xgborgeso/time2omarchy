import { readCookie, serializeCookie } from "../lib/cookie"

const COOKIE = "t2o_vid"
const MAX_AGE = 60 * 60 * 24 * 365

/**
 * A stable per-browser id, used only to count visitors and presence.
 *
 * Deliberately not an identity: it is minted by the server, never trusted for
 * anything a caller could benefit from forging, and in particular is not what
 * rate limits key on — see `clientKey`.
 */
export function visitorIdFrom(
  headers: Headers,
  resHeaders: Headers,
  secure: boolean,
): string {
  const existing = readCookie(headers.get("cookie"), COOKIE)
  if (existing && existing.length >= 8 && existing.length <= 80) return existing

  const id = crypto.randomUUID()
  resHeaders.append("set-cookie", serializeCookie(COOKIE, id, { maxAge: MAX_AGE, secure }))
  return id
}
