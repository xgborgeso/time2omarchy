import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase } from "../src/server/pglite"
import { entries, uploads } from "../src/server/schema"

/**
 * Moderation, against a real database.
 *
 * The property that matters is that a takedown is cheap to undo: a wrong one
 * has to cost nothing, because the alternative is that nobody takes anything
 * down. So the row survives, the rank survives, and destroying the image is a
 * second, separate decision.
 */
const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))

const deleted: string[] = []
vi.mock("../src/server/storage", () => ({
  publicUploadBase: () => null,
  deleteBootScreen: async (key: string | null) => {
    if (key) deleted.push(key)
  },
}))

const { takedown, restore } = await import("../src/server/takedown")
const { submitRank } = await import("../src/server/rank")
const { recordUpload } = await import("../src/server/uploads")
const { loadBoard } = await import("../src/server/board")

async function rank(handle: string, key = `${handle}-1.png`) {
  const identity = { key: `x:${handle}`, handle }
  await recordUpload(key, identity.key)
  await recordUpload(`thumb-${key}`, identity.key)
  return submitRank({
    timeSeconds: 43,
    bootScreenUrl: `/uploads/${key}`,
    bootScreenKey: key,
    bootScreenThumbUrl: `/uploads/thumb-${key}`,
    bootScreenThumbKey: `thumb-${key}`,
    cpuId: "amd-ryzen-7-9800x3d",
    ramGb: 32,
    storage: "nvme",
    identity,
  })
}

beforeEach(async () => {
  const db = await opened
  await db.delete(entries)
  await db.delete(uploads)
  deleted.length = 0
})

describe("taking an entry down", () => {
  it("hides it from the board without deleting the row", async () => {
    await rank("ada")
    expect(await takedown("ada")).toMatchObject({ ok: true, handle: "ada", purged: false })

    const board = await loadBoard()
    expect(board.entries).toHaveLength(0)
    expect(board.total).toBe(0)

    const db = await opened
    const [row] = await db.select().from(entries).where(eq(entries.handle, "ada"))
    expect(row?.hiddenAt).not.toBeNull()
  })

  it("keeps the image unless purging was asked for", async () => {
    // A wrong takedown has to be free to reverse, and there is no getting a
    // boot screen back.
    await rank("ada")
    await takedown("ada")
    expect(deleted).toEqual([])
  })

  it("destroys the image only when told to", async () => {
    await rank("ada")
    const result = await takedown("ada", true)

    expect(result).toMatchObject({ ok: true, purged: true })
    expect(deleted).toContain("ada-1.png")
    expect(deleted).toContain("thumb-ada-1.png")
  })

  it("refuses to purge a file another entry still points at", async () => {
    // Keys arrive from clients, so an entry can end up holding one it did not
    // upload. Moderating one account must not damage another.
    //
    // Written straight into the table rather than ranked twice: `submitRank`
    // refuses a key its caller does not own, so this state cannot be reached
    // through the front door. That is what makes the check defence in depth
    // rather than dead code — and defence in depth still has to work.
    await rank("ada")
    await rank("bob")
    const db = await opened
    await db
      .update(entries)
      .set({ bootScreenKey: "ada-1.png", bootScreenThumbKey: "thumb-ada-1.png" })
      .where(eq(entries.handle, "bob"))

    await takedown("ada", true)
    expect(deleted).toEqual([])
  })

  it("says so when there is nobody by that name", async () => {
    expect(await takedown("nobody")).toMatchObject({ ok: false })
  })
})

describe("putting one back", () => {
  it("returns it to the board at the rank it held", async () => {
    await rank("ada")
    await takedown("ada")
    expect(await restore("ada")).toMatchObject({ ok: true, handle: "ada" })

    const board = await loadBoard()
    expect(board.entries[0]).toMatchObject({ handle: "ada", rank: 1 })
  })

  it("cannot bring back an image that was purged", async () => {
    // The row comes back; the file does not. Which is the whole reason
    // purging is a separate flag.
    await rank("ada")
    await takedown("ada", true)
    await restore("ada")

    const board = await loadBoard()
    expect(board.entries).toHaveLength(1)
    expect(deleted).toContain("ada-1.png")
  })

  it("says so when there is nobody by that name", async () => {
    expect(await restore("nobody")).toMatchObject({ ok: false })
  })
})

describe("guards on both commands", () => {
  it("refuses to restore an entry that was never taken down", async () => {
    // Silently succeeding would make the command say it did something it did
    // not, and the next takedown would look like it had failed.
    await rank("ada")
    expect(await restore("ada")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/already on the board/i),
    })
  })

  it("takes down an entry that already is, without complaint", async () => {
    // Deliberately not symmetric with restore. Hiding something already
    // hidden reaches the state the command asked for, and a moderator running
    // it twice on a bad image should not have to wonder which run counted —
    // whereas restoring something already visible would report an undo that
    // never happened.
    await rank("ada")
    await takedown("ada")
    expect(await takedown("ada")).toMatchObject({ ok: true, handle: "ada" })
  })

  it("can purge on a second pass, having spared the file on the first", async () => {
    // The two decisions stay separate: taking down is free to reverse until
    // somebody deliberately destroys the image.
    await rank("ada")
    await takedown("ada")
    expect(deleted).toEqual([])

    await takedown("ada", true)
    expect(deleted).toContain("ada-1.png")
  })
})

describe("purging an entry that predates thumbnails", () => {
  it("skips the key it does not have", async () => {
    // Rows written before the thumbnail existed carry a null for it, and a
    // delete call on null would be a request for nothing.
    await rank("ada")
    const db = await opened
    await db
      .update(entries)
      .set({ bootScreenThumbKey: null })
      .where(eq(entries.handle, "ada"))

    await takedown("ada", true)
    expect(deleted).toEqual(["ada-1.png"])
  })
})
