/**
 * Sends a boot screen to storage and returns the url to rank with.
 *
 * Separate from ranking because tRPC carries JSON, not files — and because a
 * hosted uploader wants exactly this shape: the file goes to storage, and only
 * the resulting url is submitted.
 */

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string; field?: string }

export async function uploadBootScreen(file: File): Promise<UploadResult> {
  const body = new FormData()
  body.set("bootScreen", file)

  try {
    const res = await fetch("/api/upload", { method: "POST", body })
    return (await res.json()) as UploadResult
  } catch {
    // A rejected body never reaches the JSON parser, so say something useful.
    return { ok: false, error: "Could not upload that boot screen.", field: "bootScreen" }
  }
}
