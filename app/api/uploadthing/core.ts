/**
 * Where boot screens are uploaded.
 *
 * The bytes go from the browser straight to UploadThing and never touch this
 * app, which is the point — a serverless function has no disk worth writing to
 * and no reason to proxy four megabytes. What stays here is the decision about
 * who is allowed to upload at all.
 */
import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError, UTFiles } from "uploadthing/server"
import { MAX_BOOT_SCREEN_BYTES } from "@/lib/validation"
import { identityFrom } from "@/server/identity"
import { recordUpload } from "@/server/uploads"

const f = createUploadthing()

/** UploadThing takes a size as a string; keep it derived from the one constant. */
const MAX_SIZE = `${MAX_BOOT_SCREEN_BYTES / (1024 * 1024)}MB` as const

export const fileRouter = {
  bootScreen: f({
    // Two: the full boot screen and the thumbnail the board draws.
    image: { maxFileSize: MAX_SIZE, maxFileCount: 2 },
  })
    /**
     * The same gate the rank mutation uses, applied before a byte is accepted.
     *
     * Without it the storage bucket is an open drop box: uploading would cost
     * an anonymous caller nothing, and the bill would be ours.
     */
    .middleware(async ({ req, files }) => {
      const identity = await identityFrom(req.headers)
      // Given a code rather than a bare string: the string constructor stamps
      // every error `INTERNAL_SERVER_ERROR`, which would make our own refusal
      // indistinguishable from a crash inside UploadThing. The client reads
      // the code, not the message — see `src/lib/upload-error.ts`.
      if (!identity) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "Connect X before uploading.",
        })
      }

      return {
        // Returned to onUploadComplete, and nowhere near the client.
        identityKey: identity.key,
        handle: identity.handle,
        /**
         * Renaming here rather than in the browser, which is where the name
         * would otherwise be decided — and a name the client chooses is a
         * name the client can lie about.
         *
         * Worth doing at all because the storage key is an opaque 48
         * characters: without this every file in the dashboard is called
         * `boot-screen.webp`, which is unreviewable the first time something
         * is reported. The client re-encodes to WebP, so the extension is
         * accurate — and UploadThing checks, refusing any file whose declared
         * type disagrees with its bytes.
         */
        [UTFiles]: files.map((file) => ({
          ...file,
          // Distinct, or the pair is indistinguishable in the dashboard and in
          // the upload result.
          name: file.name.includes("thumb")
            ? `${identity.handle}-thumb.webp`
            : `${identity.handle}.webp`,
        })),
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Remembered before the client is told anything. A key is public the
      // moment it reaches the board, so the only thing that distinguishes its
      // owner from a passer-by is this row.
      await recordUpload(file.key, metadata.identityKey)

      // The key is what deletes the file later, and UploadThing offers no way
      // to derive one from a url — so it goes back to the client and is stored
      // on the entry alongside the url. `thumb` says which of the pair this is.
      return {
        key: file.key,
        url: file.ufsUrl,
        thumb: file.name.includes("-thumb"),
        handle: metadata.handle,
      }
    }),
} satisfies FileRouter

export type AppFileRouter = typeof fileRouter
