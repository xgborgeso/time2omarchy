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
 * how the seeded development board works. With one, a url counts only if its
 * origin is exactly that host — a prefix match would accept
 * `https://cdn.example.com.evil.test/uploads/x.png`.
 *
 * The last path segment is the name, whatever the segments before it are
 * called: UploadThing serves `/f/<key>` and the local disk serves
 * `/uploads/<file>`, and neither shape is worth hard-coding twice.
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

  // Exactly two: `/f/<key>` from UploadThing, `/uploads/<file>` from a bucket.
  // One segment means the path was something else that normalised down to it —
  // `/uploads/../secret.png` becomes `/secret.png` before this ever sees it —
  // and three means a nested path neither host produces.
  const segments = parsed.pathname.split("/").filter(Boolean)
  const name = segments.at(-1)
  if (!name || segments.length !== 2 || name.includes("..")) return null
  return name
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

/**
 * Whether a url and the key submitted beside it describe the same file.
 *
 * The key is what deletes the file later — UploadThing has no way to derive
 * one from a url — so it is stored alongside. Checking the pair means a
 * mismatched key cannot orphan a file, or worse, delete somebody else's on the
 * next re-rank.
 */
export function keyMatchesUrl(
  key: string,
  url: string,
  publicBase: string | null,
): boolean {
  const name = uploadName(url, publicBase)
  return name !== null && name === key
}
