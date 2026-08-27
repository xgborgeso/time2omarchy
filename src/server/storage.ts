import fs from "node:fs/promises"
import path from "node:path"
import { localUploadName } from "../lib/storage-key"

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

export async function storeBootScreen(file: File, handle: string): Promise<string> {
  const ext = extensionFor(file.type, file.name || "")
  const filename = `${handle}-${Date.now()}.${ext}`

  await fs.mkdir(UPLOADS, { recursive: true })
  await fs.writeFile(path.join(UPLOADS, filename), new Uint8Array(await file.arrayBuffer()))
  return `/uploads/${filename}`
}

/**
 * Removes a boot screen that has been replaced.
 *
 * Best effort by design: a rank that succeeded must not fail because the old
 * file could not be cleaned up. Without this every re-rank left a file behind
 * that nothing referenced.
 */
export async function deleteBootScreen(url: string): Promise<void> {
  const name = localUploadName(url)
  if (!name) return
  try {
    await fs.rm(path.join(UPLOADS, name), { force: true })
  } catch {
    // An orphan costs disk; a thrown error costs the user their rank.
  }
}
