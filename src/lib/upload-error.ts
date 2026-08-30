/**
 * What to say when a boot screen does not reach storage.
 *
 * `startUpload` never throws. On any failure it hands the error to
 * `onUploadError` and returns `undefined`, so without this every cause — a
 * session that expired, a file over the limit, a dropped connection, a server
 * callback that failed — collapsed into one sentence that named none of them.
 * That sentence was unactionable for the person and undiagnosable for us.
 *
 * Each message here is ours. UploadThing's own wording is deliberately not
 * passed through: it is written for whoever wired the route up, and some of it
 * names internals. What survives is the distinction between the causes, which
 * is the part that was missing.
 */
import type { UploadThingError } from "uploadthing/server"

/** The one shown when the cause is ours to fix rather than theirs. */
const GENERIC = "Could not upload that boot screen. Try again in a moment."

/**
 * Only the codes whose cause a person can act on.
 *
 * `FORBIDDEN` is the file router's own refusal — see the middleware in
 * `app/api/uploadthing/core.ts`, which sets that code explicitly so it stays
 * distinguishable from a genuine failure inside UploadThing.
 */
const SAID: Partial<Record<UploadThingError["code"], string>> = {
  FORBIDDEN: "Connect X before uploading.",
  TOO_LARGE: "That boot screen is too large.",
  TOO_SMALL: "That file is empty.",
  TOO_MANY_FILES: "Add one boot screen.",
  BAD_REQUEST: "That file was not accepted.",
}

export function uploadErrorFrom(error: unknown): string {
  const code = (error as UploadThingError | null)?.code
  return (code && SAID[code]) || GENERIC
}
