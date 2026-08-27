/**
 * Proving that a handle belongs to whoever typed it.
 *
 * X's public oEmbed endpoint needs no key and no account, and returns the two
 * things a proof needs: who wrote a post, and what it said. It does not return
 * a numeric user id at any price, so identity is the handle — see
 * `IDENTITY_SOURCE`.
 */

/** `identity_key` is a `source:id` string; oEmbed only ever gives us a handle. */
const IDENTITY_SOURCE = "x"

const NONCE_PREFIX = "t2o-"

/** Only the post id matters: oEmbed resolves by id and ignores the url's handle. */
const POST_URL = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/(\d+)/

export type ResolvedPost = {
  handle: string
  text: string
}

export function identityKeyFor(handle: string): string {
  return `${IDENTITY_SOURCE}:${handle.toLowerCase()}`
}

export function newNonce(): string {
  return `${NONCE_PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`
}

/** What the claimant has to post. The nonce is the whole proof. */
export function claimText(nonce: string): string {
  return `Verifying my time2omarchy entry: ${nonce}`
}

export function postIdFrom(url: string): string | null {
  return POST_URL.exec(url.trim())?.[1] ?? null
}

function textFromHtml(html: string): string {
  // oEmbed wraps the post in a blockquote; the <p> holds the text.
  const paragraph = /<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? ""
  return paragraph
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * `author_name` is the *display* name, which anyone can set to anyone else's
 * handle. The handle is the last path segment of `author_url`, and only that.
 */
export function parseOembed(payload: unknown): ResolvedPost | null {
  if (typeof payload !== "object" || payload === null) return null
  const { author_url: authorUrl, html } = payload as Record<string, unknown>
  if (typeof authorUrl !== "string" || typeof html !== "string") return null

  const handle = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/?$/.exec(
    authorUrl.trim(),
  )?.[1]
  if (!handle) return null

  const text = textFromHtml(html)
  if (!text) return null

  return { handle: handle.toLowerCase(), text }
}

/**
 * A public nonce can be read and replayed by anyone, so the post's author must
 * also be the handle the nonce was issued to.
 */
export function postProvesClaim(
  post: ResolvedPost,
  claimedHandle: string,
  nonce: string,
): boolean {
  if (post.handle.toLowerCase() !== claimedHandle.toLowerCase()) return false
  // Word-bounded, so a longer nonce cannot be satisfied by a shorter prefix.
  return new RegExp(`(^|\\s)${nonce}(\\s|$|[.,!?])`).test(post.text)
}
