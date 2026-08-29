/**
 * Deployment-shaped configuration, read once.
 *
 * Everything here is a fact about where the app runs rather than what it does,
 * which is why it lives apart from the code that uses it.
 */

/**
 * The header carrying the caller's address, or null with nothing in front.
 *
 * Must name a header the platform itself sets and a client cannot forge
 * through it — `cf-connecting-ip` behind Cloudflare, `x-forwarded-for` behind
 * most proxies. Unset, every caller shares one bucket, which is the safe
 * default but no defence at all against one determined visitor.
 */
export const TRUSTED_IP_HEADER = process.env.TRUSTED_IP_HEADER?.trim() || null

/** True in a deployed environment, where local shortcuts must not apply. */
export const IS_PRODUCTION = process.env.NODE_ENV === "production"

/**
 * Where boot screens are stored.
 *
 * Uploads go from the browser straight to UploadThing, so this app never holds
 * the bytes — the token is only used to delete a file that has been replaced,
 * and the base is only used to prove a submitted url is one we issued.
 *
 * Unset, the board still serves the seeded `/uploads/...` files on the local
 * disk, which is how development works with nothing configured.
 */
export const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN?.trim() || null

/** The origin uploaded boot screens are served from, e.g. `https://x.ufs.sh`. */
export const PUBLIC_UPLOAD_BASE = process.env.PUBLIC_UPLOAD_BASE?.trim() || null

export function objectStoreConfigured(): boolean {
  return Boolean(UPLOADTHING_TOKEN && PUBLIC_UPLOAD_BASE)
}
