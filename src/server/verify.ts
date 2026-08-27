import { and, eq, isNull, lt } from "drizzle-orm"
import {
  claimText,
  identityKeyFor,
  newNonce,
  parseOembed,
  postIdFrom,
  postProvesClaim,
} from "../lib/verification"
import { getDb } from "./db"
import { claims } from "./schema"

/** Long enough to write a post, short enough that a leaked nonce goes stale. */
const CLAIM_TTL_MS = 15 * 60 * 1000

const OEMBED = "https://publish.twitter.com/oembed"

export type ClaimIssued = { nonce: string; text: string; expiresAt: string }

export async function issueClaim(handle: string): Promise<ClaimIssued> {
  const db = await getDb()

  // Claims are only ever created here, so this is where the dead ones go. An
  // expired claim can never be spent, and without this the table only grows.
  await db.delete(claims).where(lt(claims.expiresAt, new Date()))

  const nonce = newNonce()
  const expiresAt = new Date(Date.now() + CLAIM_TTL_MS)
  await db.insert(claims).values({ nonce, handle: handle.toLowerCase(), expiresAt })
  return { nonce, text: claimText(nonce), expiresAt: expiresAt.toISOString() }
}

export type PostResolver = (postUrl: string) => Promise<unknown>

/**
 * Resolves a post through X's public oEmbed endpoint. No key, no account: it
 * resolves by post id and ignores the handle in the url, so what comes back is
 * authoritative and what was submitted is not.
 */
async function resolvePost(postUrl: string): Promise<unknown> {
  const id = postIdFrom(postUrl)
  if (!id) return null
  // Rebuild the url from the id rather than forwarding the user's string.
  const canonical = `https://x.com/i/status/${id}`
  const res = await fetch(`${OEMBED}?url=${encodeURIComponent(canonical)}&omit_script=1`, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    // A missing post answers with an HTML error page, not JSON.
    return null
  }
}

export type VerifyOutcome = { ok: true; identityKey: string } | { ok: false; error: string }

/**
 * Spends a claim. The claim is looked up unconsumed and unexpired, and the
 * post's author must be the handle it was issued to — a public nonce alone
 * proves nothing, since anyone can read one.
 */
export async function verifyClaim(
  nonce: string,
  postUrl: string,
  /** Injected in tests so the claim lifecycle is covered without the network. */
  resolve: PostResolver = resolvePost,
): Promise<VerifyOutcome> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.nonce, nonce), isNull(claims.consumedAt)))
    .limit(1)

  const claim = rows[0]
  if (!claim)
    return { ok: false, error: "That verification link was already used. Start again." }
  if (claim.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That verification expired. Start again." }
  }

  const post = parseOembed(await resolve(postUrl))
  if (!post)
    return { ok: false, error: "Could not read that post. Check the link is public." }

  if (!postProvesClaim(post, claim.handle, nonce)) {
    return {
      ok: false,
      error: `That post does not prove @${claim.handle}. Check the text and the account.`,
    }
  }

  // Spend it only once, and only if it is still unspent, so two requests
  // racing the same nonce cannot both win.
  const spent = await db
    .update(claims)
    .set({ consumedAt: new Date() })
    .where(and(eq(claims.nonce, nonce), isNull(claims.consumedAt)))
    .returning()
  if (spent.length === 0) return { ok: false, error: "That verification was already used." }

  return { ok: true, identityKey: identityKeyFor(claim.handle) }
}
