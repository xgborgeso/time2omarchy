/**
 * Redrawing a boot screen before it leaves the browser.
 *
 * Uploads go straight from the browser to UploadThing, so there is no server
 * in the middle to sanitise anything. Decoding the file and drawing it to a
 * canvas does three jobs at once, none of which we could do afterwards:
 *
 *  - **Strips EXIF.** A phone photograph of a monitor carries GPS coordinates,
 *    and this board publishes every image. A canvas keeps pixels and nothing
 *    else, so the metadata is gone by construction rather than by filtering.
 *  - **Proves it is an image.** Anything the browser cannot decode fails here,
 *    which is a stronger check than the declared MIME type — that is set by
 *    whoever sends the file.
 *  - **Makes it small.** A 4MB phone photo becomes a few hundred kilobytes of
 *    WebP, which is the difference between the free storage tier holding
 *    hundreds of entries and holding thousands.
 *
 * None of this is a defence against a determined uploader, who can talk to
 * storage directly. It is a defence against the ordinary case, which is
 * somebody who does not know their photo has their address in it.
 */

/** Wide enough that a 4K screenshot stays legible, small enough to be cheap. */
const MAX_EDGE = 2000

/** High enough that text on a boot screen stays sharp. */
const QUALITY = 0.85

export type ReencodeResult = { ok: true; file: File } | { ok: false; error: string }

function scaled(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= MAX_EDGE) return { width, height }
  const ratio = MAX_EDGE / longest
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

/** Decoded through the browser's own image pipeline, or not at all. */
async function decode(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file)
  } catch {
    return null
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", QUALITY)
  })
}

export async function reencodeBootScreen(file: File): Promise<ReencodeResult> {
  const bitmap = await decode(file)
  if (!bitmap) {
    return { ok: false, error: "That file is not an image we can read." }
  }

  try {
    const { width, height } = scaled(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) return { ok: false, error: "Could not process that image." }
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await toBlob(canvas)
    if (!blob) return { ok: false, error: "Could not process that image." }

    // Named, not renamed: the extension has to match the bytes now that they
    // are WebP whatever went in.
    return {
      ok: true,
      file: new File([blob], "boot-screen.webp", { type: "image/webp" }),
    }
  } finally {
    // Frees the decoded pixels immediately rather than at the next collection.
    bitmap.close()
  }
}
