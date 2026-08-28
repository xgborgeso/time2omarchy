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
 * Where boot screens are stored, and the public host they are served from.
 *
 * Unset, uploads go to `public/uploads` on the local disk — fine for
 * development and impossible in a deployment, where that disk is ephemeral and
 * unshared. `storage.ts` refuses to start a production upload without these
 * rather than writing a file that vanishes on the next request.
 */
export const OBJECT_STORE = {
  endpoint: process.env.S3_ENDPOINT?.trim() || null,
  bucket: process.env.S3_BUCKET?.trim() || null,
  accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() || null,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() || null,
  /** The origin boot screen urls are written with, e.g. a CDN in front. */
  publicBase: process.env.PUBLIC_UPLOAD_BASE?.trim() || null,
} as const

export function objectStoreConfigured(): boolean {
  const { endpoint, bucket, accessKeyId, secretAccessKey, publicBase } = OBJECT_STORE
  return Boolean(endpoint && bucket && accessKeyId && secretAccessKey && publicBase)
}
