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
 * Whether a url is one this app actually issued.
 *
 * Ranking takes a url rather than a file, so this is the gate that stops
 * someone putting an arbitrary remote image on the board for every visitor to
 * load.
 */
export function isStoredBootScreen(url: string): boolean {
  return localUploadName(url) !== null
}
