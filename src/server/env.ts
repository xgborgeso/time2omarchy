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

/** What an UploadThing token carries once decoded. */
export type UploadStore = {
  token: string
  appId: string
  /** The origin uploads are served from, e.g. `https://x.ufs.sh`. */
  base: string
}

/**
 * The upload configuration, proved rather than assumed.
 *
 * Presence was the only thing ever checked here, and presence is not the
 * failure that happens. A token pasted with the quotes around it is present,
 * looks right in a dashboard, and fails only when somebody tries to upload —
 * as a bare 500 with nothing in the log, because the decode happens inside
 * UploadThing rather than here. That cost an afternoon.
 *
 * So the shape is checked where a wrong value can still be cheap: unset is
 * fine and means local disk, but set-and-wrong throws, which fails the build
 * instead of the first upload.
 *
 * Returns null when nothing is configured. Throws, with the fix, when
 * something is configured wrongly.
 */
export function readUploadStore(
  rawToken: string | null,
  rawBase: string | null,
): UploadStore | null {
  const token = rawToken?.trim() || null
  const base = rawBase?.trim() || null

  if (!token && !base) return null

  // Half-configured is refused rather than degraded: a token with no host
  // cannot produce a usable url, and a host with no token cannot delete a
  // replaced file. Either way uploads are broken, so say so now.
  if (!token) throw new Error("PUBLIC_UPLOAD_BASE is set but UPLOADTHING_TOKEN is not.")
  if (!base) throw new Error("UPLOADTHING_TOKEN is set but PUBLIC_UPLOAD_BASE is not.")

  // Checked before decoding, because Node's decoder is lenient: it skips any
  // character outside the alphabet, so `'token'` and `token` decode to exactly
  // the same bytes. Every way a paste goes wrong — surrounding quotes, a
  // trailing newline, a stray space — is invisible to it, which makes the
  // decode useless as a check unless the alphabet is enforced first.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(token)) {
    throw new Error(
      "UPLOADTHING_TOKEN has characters that are not base64. If it was pasted " +
        "with quotes around it, remove them: a shell strips them from a .env " +
        "file and a hosting dashboard stores them literally.",
    )
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"))
  } catch {
    throw new Error(
      "UPLOADTHING_TOKEN is base64 but does not decode to JSON. It is probably " +
        "truncated — the whole value is one long line with no breaks.",
    )
  }

  const record = decoded as Record<string, unknown>
  const appId = record?.appId
  if (typeof appId !== "string" || !appId || typeof record.apiKey !== "string") {
    throw new Error(
      "UPLOADTHING_TOKEN decoded, but is not { apiKey, appId, regions }. It is " +
        "probably a different credential.",
    )
  }

  // The two are issued together and cannot disagree. When they do, every
  // upload succeeds and every rank is then rejected, because the board only
  // accepts urls from the origin it was told about.
  const expected = `https://${appId}.ufs.sh`
  if (base !== expected) {
    throw new Error(
      `PUBLIC_UPLOAD_BASE is ${base}, but UPLOADTHING_TOKEN belongs to app ` +
        `${appId}. It should be ${expected}.`,
    )
  }

  return { token, appId, base }
}

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
const uploadStore = readUploadStore(
  process.env.UPLOADTHING_TOKEN ?? null,
  process.env.PUBLIC_UPLOAD_BASE ?? null,
)

export const UPLOADTHING_TOKEN = uploadStore?.token ?? null

/** The origin uploaded boot screens are served from, e.g. `https://x.ufs.sh`. */
export const PUBLIC_UPLOAD_BASE = uploadStore?.base ?? null

export function objectStoreConfigured(): boolean {
  return uploadStore !== null
}
