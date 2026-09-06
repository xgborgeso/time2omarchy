import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Deleting a boot screen that has been replaced.
 *
 * Nothing here uploads: bytes go from the browser straight to UploadThing.
 * What is left is a delete that must never cost somebody their rank — a
 * cleanup failure is an orphaned file, and an orphaned file is cheaper than a
 * refused entry.
 */
const deleteFiles = vi.fn(async () => ({ success: true }))
vi.mock("uploadthing/server", () => ({
  UTApi: class {
    deleteFiles = deleteFiles
  },
}))

const TOKEN = Buffer.from(
  JSON.stringify({ apiKey: "sk_test", appId: "abc123", regions: ["sea1"] }),
).toString("base64")

beforeEach(() => {
  vi.resetModules()
  deleteFiles.mockClear()
  deleteFiles.mockResolvedValue({ success: true })
  vi.unstubAllEnvs()
})

async function storage(configured: boolean) {
  if (configured) {
    vi.stubEnv("UPLOADTHING_TOKEN", TOKEN)
    vi.stubEnv("PUBLIC_UPLOAD_BASE", "https://abc123.ufs.sh")
  } else {
    vi.stubEnv("UPLOADTHING_TOKEN", "")
    vi.stubEnv("PUBLIC_UPLOAD_BASE", "")
  }
  return import("../src/server/storage")
}

describe("with no object store configured", () => {
  it("has no host to serve boot screens from", async () => {
    const { publicUploadBase } = await storage(false)
    expect(publicUploadBase()).toBeNull()
  })

  it("deletes nothing, rather than failing", async () => {
    // Development runs with nothing configured, and a rank there must work.
    const { deleteBootScreen } = await storage(false)
    await expect(deleteBootScreen("some-key")).resolves.toBeUndefined()
    expect(deleteFiles).not.toHaveBeenCalled()
  })
})

describe("with an object store configured", () => {
  it("reports the host the token belongs to", async () => {
    const { publicUploadBase } = await storage(true)
    expect(publicUploadBase()).toBe("https://abc123.ufs.sh")
  })

  it("deletes the key it was given", async () => {
    const { deleteBootScreen } = await storage(true)
    await deleteBootScreen("boot-1.webp")
    expect(deleteFiles).toHaveBeenCalledWith("boot-1.webp")
  })

  it("ignores a missing key without asking the api", async () => {
    const { deleteBootScreen } = await storage(true)
    await deleteBootScreen(null)
    expect(deleteFiles).not.toHaveBeenCalled()
  })

  it("swallows a failure, because an orphan is cheaper than a lost rank", async () => {
    deleteFiles.mockRejectedValueOnce(new Error("gone"))
    const { deleteBootScreen } = await storage(true)
    await expect(deleteBootScreen("boot-1.webp")).resolves.toBeUndefined()
  })

  it("builds the client once and reuses it", async () => {
    const { deleteBootScreen } = await storage(true)
    await deleteBootScreen("a.webp")
    await deleteBootScreen("b.webp")
    expect(deleteFiles).toHaveBeenCalledTimes(2)
  })
})

describe("objectStoreConfigured", () => {
  it("says whether uploads have anywhere to go", async () => {
    // The upload route mounts regardless, so this is how anything above it
    // can tell the difference between "not configured" and "broken".
    vi.stubEnv("UPLOADTHING_TOKEN", "")
    vi.stubEnv("PUBLIC_UPLOAD_BASE", "")
    const bare = await import("../src/server/env")
    expect(bare.objectStoreConfigured()).toBe(false)

    vi.resetModules()
    vi.stubEnv("UPLOADTHING_TOKEN", TOKEN)
    vi.stubEnv("PUBLIC_UPLOAD_BASE", "https://abc123.ufs.sh")
    const configured = await import("../src/server/env")
    expect(configured.objectStoreConfigured()).toBe(true)
  })
})
