/**
 * Boot screen upload, kept separate from ranking.
 *
 * tRPC carries JSON, not files, and splitting the two is the shape a hosted
 * uploader wants anyway: the file goes straight to storage and only the
 * resulting url is submitted with the rank.
 */
import { clientKeyFrom } from "@/lib/ratelimit"
import { MAX_BOOT_SCREEN_BYTES, validateBootScreen } from "@/lib/validation"
import { TRUSTED_IP_HEADER } from "@/server/env"
import { identityFrom } from "@/server/identity"
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

    const caller = clientKeyFrom(request.headers, { trustedHeader: TRUSTED_IP_HEADER })
    if (!uploadLimit.check(caller).allowed) {
      return fail("Slow down. Try again in an hour.", 429)
    }

    // Storage is only ever written on behalf of an account. Without this an
    // anonymous caller could fill the bucket with anything at no cost, and the
    // rate limit alone is a speed bump rather than a door.
    const identity = await identityFrom(request.headers)
    if (!identity) return fail("Connect X before uploading.", 401)

    const form = await request.formData()

    const uploaded = form.get("bootScreen")
    const file = uploaded instanceof File ? uploaded : null
    const issue = validateBootScreen(file)
    if (issue || !file) {
      return fail(issue?.error ?? "Add a boot screen", 400)
    }

    return Response.json({ ok: true, url: await storeBootScreen(file, identity.handle) })
  } catch (err) {
    await captureError(err)
    return fail("Upload failed", 500)
  }
}
