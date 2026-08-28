/**
 * Working out what a stored boot screen is called, so a replaced one can be
 * removed and a submitted one can be checked.
 *
 * Every function here refuses anything it cannot prove we wrote: deleting is
 * destructive, and ranking takes a url, so the only safe default is no.
 */

export function localUploadName(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null
  const name = url.slice("/uploads/".length)
  // A flat filename only; a path segment is either traversal or not ours.
  if (!name || name.includes("/") || name.includes("..")) return null
  return name
}

/**
 * The stored name behind a boot screen url, wherever it is hosted.
 *
 * With no host configured only the local `/uploads/...` form is ours, which is
 * how development works. With one, a url counts only if its origin is exactly
 * that host — a prefix match would accept
 * `https://cdn.example.com.evil.test/uploads/x.png`.
 */
export function uploadName(url: string, publicBase: string | null): string | null {
  const trimmed = url.trim()
  if (!publicBase) return localUploadName(trimmed)

  let parsed: URL
  let base: URL
  try {
    parsed = new URL(trimmed)
    base = new URL(publicBase)
  } catch {
    return null
  }
  if (parsed.origin !== base.origin) return null

  return localUploadName(parsed.pathname)
}

/**
 * Whether a url is one this app actually issued.
 *
 * Ranking takes a url rather than a file, so this is the gate that stops
 * someone putting an arbitrary remote image on the board for every visitor to
 * load.
 */
export function isStoredBootScreen(url: string, publicBase: string | null = null): boolean {
  return uploadName(url, publicBase) !== null
}
