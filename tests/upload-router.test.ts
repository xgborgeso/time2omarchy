import { UTFiles } from "uploadthing/server"
import { describe, expect, it, vi } from "vitest"

/**
 * Who is allowed to upload a boot screen at all.
 *
 * The bytes never touch this app, so the file router is one decision: whether
 * this caller gets a signed url. Without it the storage bucket is an open drop
 * box, and the bill is ours.
 */
let identity: { key: string; handle: string } | null = { key: "x:1", handle: "ada" }
vi.mock("@/server/identity", () => ({ identityFrom: async () => identity }))

const recorded: [string, string][] = []
vi.mock("@/server/uploads", () => ({
  recordUpload: async (key: string, owner: string) => {
    recorded.push([key, owner])
  },
}))

const { fileRouter } = await import("../app/api/uploadthing/core")

/** The middleware, reached the way UploadThing reaches it. */
// biome-ignore lint/suspicious/noExplicitAny: the router's internals are not typed for callers
const bootScreen = fileRouter.bootScreen as any

function run(files: { name: string }[]) {
  return bootScreen.middleware({ req: new Request("https://x/"), files })
}

describe("the upload gate", () => {
  it("refuses anyone without an account behind them", async () => {
    identity = null
    await expect(run([{ name: "boot-screen.webp" }])).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })

  it("gives the refusal a code the form can read", async () => {
    // A bare string constructor stamps every error INTERNAL_SERVER_ERROR,
    // which would make our own refusal indistinguishable from a crash — and
    // `uploadErrorFrom` reads the code, not the message.
    identity = null
    await run([{ name: "boot-screen.webp" }]).catch((err: { code: string }) => {
      expect(err.code).toBe("FORBIDDEN")
    })
  })

  it("lets a signed-in account through, carrying its identity", async () => {
    identity = { key: "x:1", handle: "ada" }
    const meta = await run([{ name: "boot-screen.webp" }])
    expect(meta).toMatchObject({ identityKey: "x:1", handle: "ada" })
  })

  it("renames the pair after the account, not after what was sent", async () => {
    // A name the client chooses is a name the client can lie about, and every
    // file called boot-screen.webp is unreviewable the first time one is
    // reported.
    identity = { key: "x:1", handle: "ada" }
    const meta = await run([{ name: "boot-screen.webp" }, { name: "boot-thumb.webp" }])

    const names = (meta[UTFiles] as { name: string }[]).map((f) => f.name)
    expect(names).toEqual(["ada.webp", "ada-thumb.webp"])
  })

  it("gives the two files distinct names", async () => {
    // Indistinguishable in the dashboard and in the upload result otherwise.
    identity = { key: "x:1", handle: "ada" }
    const meta = await run([{ name: "a.webp" }, { name: "a-thumb.webp" }])
    const names = (meta[UTFiles] as { name: string }[]).map((f) => f.name)
    expect(new Set(names).size).toBe(2)
  })
})

describe("once a file lands", () => {
  it("remembers who owns the key before the client is told anything", async () => {
    // Every key on the board is public — it is the last segment of a boot
    // screen url — so this row is the only thing separating its owner from a
    // passer-by.
    recorded.length = 0
    const result = await bootScreen.onUploadComplete({
      metadata: { identityKey: "x:1", handle: "ada" },
      file: { key: "abc", ufsUrl: "https://x.ufs.sh/f/abc", name: "ada.webp" },
    })

    expect(recorded).toEqual([["abc", "x:1"]])
    expect(result).toMatchObject({ key: "abc", url: "https://x.ufs.sh/f/abc" })
  })

  it("says which of the pair the thumbnail is", async () => {
    const full = await bootScreen.onUploadComplete({
      metadata: { identityKey: "x:1", handle: "ada" },
      file: { key: "a", ufsUrl: "u", name: "ada.webp" },
    })
    const thumb = await bootScreen.onUploadComplete({
      metadata: { identityKey: "x:1", handle: "ada" },
      file: { key: "b", ufsUrl: "u", name: "ada-thumb.webp" },
    })

    expect(full.thumb).toBe(false)
    expect(thumb.thumb).toBe(true)
  })
})
