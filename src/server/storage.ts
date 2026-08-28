import fs from "node:fs/promises"
import path from "node:path"
import { AwsClient } from "aws4fetch"
import { localUploadName, uploadName } from "../lib/storage-key"
import { IS_PRODUCTION, OBJECT_STORE, objectStoreConfigured } from "./env"

const UPLOADS = path.resolve("public/uploads")

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

function extensionFor(type: string, name: string): string {
  if (EXT[type]) return EXT[type]
  const fromName = name.split(".").pop()?.toLowerCase()
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName
  }
  return "png"
}

/** The host boot screens are served from, or null while they are local. */
export function publicUploadBase(): string | null {
  return objectStoreConfigured() ? OBJECT_STORE.publicBase : null
}

let client: AwsClient | null = null

function aws(): AwsClient {
  if (!client) {
    client = new AwsClient({
      accessKeyId: OBJECT_STORE.accessKeyId as string,
      secretAccessKey: OBJECT_STORE.secretAccessKey as string,
      // R2 ignores the region but the signature needs one.
      region: "auto",
      service: "s3",
    })
  }
  return client
}

function objectUrl(name: string): string {
  return `${OBJECT_STORE.endpoint}/${OBJECT_STORE.bucket}/uploads/${name}`
}

/**
 * Stores a boot screen and returns the url the board will point at.
 *
 * Object storage wherever it is configured, the local disk otherwise. A
 * deployment without it is refused outright: `public/uploads` on a serverless
 * host is ephemeral and unshared, so the write appears to succeed and the
 * image is gone by the time anyone loads the board.
 */
export async function storeBootScreen(file: File, handle: string): Promise<string> {
  const ext = extensionFor(file.type, file.name || "")
  const filename = `${handle}-${Date.now()}.${ext}`
  const body = new Uint8Array(await file.arrayBuffer())

  if (!objectStoreConfigured()) {
    if (IS_PRODUCTION) {
      throw new Error(
        "Object storage is not configured; refusing to write an upload to a disk that will not survive.",
      )
    }
    await fs.mkdir(UPLOADS, { recursive: true })
    await fs.writeFile(path.join(UPLOADS, filename), body)
    return `/uploads/${filename}`
  }

  const response = await aws().fetch(objectUrl(filename), {
    method: "PUT",
    body,
    headers: {
      "content-type": file.type || "image/png",
      // Boot screens are immutable once written; the name carries a timestamp.
      "cache-control": "public, max-age=31536000, immutable",
    },
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`)
  }

  return `${OBJECT_STORE.publicBase}/uploads/${filename}`
}

/**
 * Removes a boot screen that has been replaced.
 *
 * Best effort by design: a rank that succeeded must not fail because the old
 * file could not be cleaned up. Without this every re-rank left a file behind
 * that nothing referenced.
 */
export async function deleteBootScreen(url: string): Promise<void> {
  const name = uploadName(url, publicUploadBase())
  if (!name) return

  try {
    if (!objectStoreConfigured()) {
      if (localUploadName(url)) await fs.rm(path.join(UPLOADS, name), { force: true })
      return
    }
    await aws().fetch(objectUrl(name), { method: "DELETE" })
  } catch {
    // An orphan costs storage; a thrown error costs the user their rank.
  }
}
