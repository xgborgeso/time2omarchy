/**
 * Reading and writing cookies from plain headers.
 *
 * Framework-free on purpose: the same helpers serve a tRPC handler, a route
 * handler, and a test, none of which share a request object.
 */

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null

  for (const part of header.split(";")) {
    const pair = part.trim()
    const eq = pair.indexOf("=")
    if (eq < 1) continue
    // Compare the whole name, so "other_vid" cannot satisfy a read of "vid".
    if (pair.slice(0, eq) !== name) continue
    try {
      return decodeURIComponent(pair.slice(eq + 1))
    } catch {
      return pair.slice(eq + 1)
    }
  }
  return null
}

export type CookieOptions = {
  maxAge: number
  /** Only over https; a Secure cookie on http is silently dropped. */
  secure: boolean
}

export function serializeCookie(
  name: string,
  value: string,
  { maxAge, secure }: CookieOptions,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ]
  if (secure) parts.push("Secure")
  return parts.join("; ")
}
