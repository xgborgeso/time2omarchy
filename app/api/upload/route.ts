/**
 * Boot screen upload, kept separate from ranking.
 *
 * tRPC carries JSON, not files, and splitting the two is the shape a hosted
 * uploader wants anyway: the file goes straight to storage and only the
 * resulting url is submitted with the rank.
 */
import { clientKey } from "@/lib/ratelimit"
import { handleSchema, MAX_BOOT_SCREEN_BYTES, validateBootScreen } from "@/lib/validation"
import { Limiter } from "@/server/ratelimit"
import { captureError } from "@/server/sentry"
import { storeBootScreen } from "@/server/storage"

export const runtime = "nodejs"

const uploadLimit = new Limiter({ windowMs: 60 * 60 * 1000, max: 12 })

/** Metadata rides along with the file, so allow a little slack over it. */
const MAX_BODY_BYTES = MAX_BOOT_SCREEN_BYTES + 64 * 1024

function fail(error: string, status: number): Response {
  return Response.json({ ok: false, error, field: "bootScreen" }, { status })
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return fail("Send multipart form data", 415)
    }

    // Refuse an oversized body before parsing it. Checking the file size after
    // the upload has already been received is far too late to save anything.
    const declared = Number(request.headers.get("content-length") ?? "0")
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return fail("That boot screen is too large.", 413)
    }

    if (!uploadLimit.check(clientKey(null)).allowed) {
      return fail("Slow down. Try again in an hour.", 429)
    }

    const form = await request.formData()

    const handle = handleSchema.safeParse(String(form.get("handle") ?? ""))
    if (!handle.success) {
      return Response.json(
        { ok: false, error: "Add an X handle", field: "handle" },
        { status: 400 },
      )
    }

    const uploaded = form.get("bootScreen")
    const file = uploaded instanceof File ? uploaded : null
    const issue = validateBootScreen(file)
    if (issue || !file) {
      return fail(issue?.error ?? "Add a boot screen", 400)
    }

    return Response.json({ ok: true, url: await storeBootScreen(file, handle.data) })
  } catch (err) {
    await captureError(err)
    return fail("Upload failed", 500)
  }
}
