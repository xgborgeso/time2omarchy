import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase } from "../src/server/pglite"
import { account, user } from "../src/server/schema"

/**
 * Turning a session into the identity an entry is keyed on.
 *
 * The X account id, not the handle. A handle can be renamed and reused; the id
 * cannot, which is what makes "only you can change your entry" true across a
 * rename rather than only until one.
 */
const opened = openDatabase().then((o) => o.db)
vi.mock("../src/server/db", () => ({ getDb: () => opened }))

let session: { user: { id: string; handle: string } } | null = null
vi.mock("../src/server/auth", () => ({
  getAuth: async () => ({ api: { getSession: async () => session } }),
}))

const { identityFrom } = await import("../src/server/identity")

async function withAccount(userId: string, providerId: string, accountId: string) {
  const db = await opened
  await db.insert(user).values({
    id: userId,
    name: userId,
    handle: userId,
    email: `${userId}@example.test`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  await db.insert(account).values({
    id: `${userId}-${providerId}`,
    userId,
    providerId,
    accountId,
    // Required by Better Auth's own schema; nothing here reads it.
    issuer: providerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

beforeEach(async () => {
  const db = await opened
  await db.delete(account)
  await db.delete(user)
  session = null
})

describe("identityFrom", () => {
  it("is nobody without a session", async () => {
    expect(await identityFrom(new Headers())).toBeNull()
  })

  it("keys on the X account id, not the handle", async () => {
    await withAccount("u1", "twitter", "1665012345678901234")
    session = { user: { id: "u1", handle: "ada" } }

    expect(await identityFrom(new Headers())).toEqual({
      key: "x:1665012345678901234",
      handle: "ada",
    })
  })

  it("follows a rename, because the key never moves", async () => {
    // The whole reason the id is the identity: the entry has to follow the
    // account rather than stay behind under the old name.
    await withAccount("u1", "twitter", "1665012345678901234")
    session = { user: { id: "u1", handle: "ada" } }
    const before = await identityFrom(new Headers())

    session = { user: { id: "u1", handle: "ada-renamed" } }
    const after = await identityFrom(new Headers())

    expect(after?.key).toBe(before?.key)
    expect(after?.handle).toBe("ada-renamed")
  })

  it("refuses a session with no X account behind it", async () => {
    // There is no other way to sign in today, so this only fires if one is
    // added later — and a session that cannot verify anything must not rank.
    await withAccount("u1", "github", "999")
    session = { user: { id: "u1", handle: "ada" } }

    expect(await identityFrom(new Headers())).toBeNull()
  })

  it("refuses a session whose user has no account row at all", async () => {
    session = { user: { id: "ghost", handle: "ada" } }
    expect(await identityFrom(new Headers())).toBeNull()
  })

  it("does not read another user's account", async () => {
    await withAccount("u1", "twitter", "111")
    await withAccount("u2", "twitter", "222")
    session = { user: { id: "u2", handle: "bob" } }

    expect(await identityFrom(new Headers())).toMatchObject({ key: "x:222" })
  })
})
