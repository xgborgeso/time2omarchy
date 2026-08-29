import { UTApi } from "uploadthing/server"
import { PUBLIC_UPLOAD_BASE, UPLOADTHING_TOKEN } from "./env"

/**
 * Boot screen storage, which this app no longer touches.
 *
 * Bytes go from the browser straight to UploadThing — see
 * `app/api/uploadthing/core.ts` — so nothing here uploads anything. What is
 * left is the two things a server still has to know: the host the files are
 * served from, and how to delete one that nothing references any more.
 */

/** The host boot screens are served from, or null while they are local. */
export function publicUploadBase(): string | null {
  return PUBLIC_UPLOAD_BASE
}

let api: UTApi | null = null

function utapi(): UTApi | null {
  if (!UPLOADTHING_TOKEN) return null
  if (!api) api = new UTApi({ token: UPLOADTHING_TOKEN })
  return api
}

/**
 * Removes a boot screen that has been replaced.
 *
 * By key, because UploadThing offers no way to derive one from a url — which
 * is exactly why the key is stored on the entry beside it.
 *
 * Best effort by design: a rank that succeeded must not fail because the old
 * file could not be cleaned up. Without this every re-rank left a file behind
 * that nothing referenced, and the free tier is measured in gigabytes.
 */
export async function deleteBootScreen(key: string | null): Promise<void> {
  if (!key) return
  const client = utapi()
  if (!client) return

  try {
    await client.deleteFiles(key)
  } catch {
    // An orphan costs storage; a thrown error costs the user their rank.
  }
}
