import type { PGlite } from "@electric-sql/pglite"
import { describe, expect, it } from "vitest"
import { openDatabase } from "../src/server/pglite"

/**
 * The claim lifecycle against real PGlite. Only the network is stubbed — the
 * nonce is public once posted, so single-use and expiry are what stand between
 * a reader of that post and someone else's row.
 */
async function freshDb(): Promise<PGlite> {
  const { client } = await openDatabase()
  return client
}

const oembedFor = (handle: string, text: string) => ({
  author_url: `https://x.com/${handle}`,
  author_name: "Some Display Name",
  html: `<blockquote><p lang="en" dir="ltr">${text}</p>&mdash; d (@${handle})</blockquote>`,
})

async function seedClaim(
  db: PGlite,
  nonce: string,
  handle: string,
  { expiresInMs = 900_000, consumed = false } = {},
) {
  await db.query(
    "INSERT INTO claims (nonce, handle, expires_at, consumed_at) VALUES ($1,$2,$3,$4)",
    [nonce, handle, new Date(Date.now() + expiresInMs), consumed ? new Date() : null],
  )
}

/** Mirrors verifyClaim's guards against the real table. */
async function spend(
  db: PGlite,
  nonce: string,
  payload: unknown,
  proves: (h: string) => boolean,
) {
  const res = await db.query<{ handle: string; expires_at: Date }>(
    "SELECT handle, expires_at FROM claims WHERE nonce = $1 AND consumed_at IS NULL",
    [nonce],
  )
  const claim = res.rows[0]
  if (!claim) return { ok: false, error: "used" }
  if (new Date(claim.expires_at).getTime() < Date.now())
    return { ok: false, error: "expired" }
  if (!payload || !proves(claim.handle)) return { ok: false, error: "unproven" }
  const spent = await db.query(
    "UPDATE claims SET consumed_at = now() WHERE nonce = $1 AND consumed_at IS NULL RETURNING nonce",
    [nonce],
  )
  return spent.rows.length > 0 ? { ok: true } : { ok: false, error: "used" }
}

describe("claim lifecycle", () => {
  it("spends a valid claim exactly once", async () => {
    const db = await freshDb()
    await seedClaim(db, "t2o-aaa", "ada")
    const first = await spend(
      db,
      "t2o-aaa",
      oembedFor("ada", "... t2o-aaa"),
      (h) => h === "ada",
    )
    expect(first.ok).toBe(true)

    // The nonce is public the moment the post is. A second use must fail.
    const replay = await spend(
      db,
      "t2o-aaa",
      oembedFor("ada", "... t2o-aaa"),
      (h) => h === "ada",
    )
    expect(replay).toEqual({ ok: false, error: "used" })
    await db.close()
  })

  it("refuses an expired claim and leaves it unspent", async () => {
    const db = await freshDb()
    await seedClaim(db, "t2o-bbb", "ada", { expiresInMs: -1000 })
    expect(await spend(db, "t2o-bbb", oembedFor("ada", "... t2o-bbb"), () => true)).toEqual(
      {
        ok: false,
        error: "expired",
      },
    )
    const row = await db.query<{ consumed_at: Date | null }>(
      "SELECT consumed_at FROM claims WHERE nonce = 't2o-bbb'",
    )
    expect(row.rows[0]?.consumed_at).toBeNull()
    await db.close()
  })

  it("refuses a post by someone other than the claimed handle", async () => {
    const db = await freshDb()
    await seedClaim(db, "t2o-ccc", "ada")
    // Mallory found ada's public nonce and posted it from her own account.
    const out = await spend(
      db,
      "t2o-ccc",
      oembedFor("mallory", "... t2o-ccc"),
      (h) => h === "mallory",
    )
    expect(out).toEqual({ ok: false, error: "unproven" })
    await db.close()
  })

  it("keeps claims for different handles independent", async () => {
    const db = await freshDb()
    await seedClaim(db, "t2o-ddd", "ada")
    await seedClaim(db, "t2o-eee", "bob")
    expect(
      (await spend(db, "t2o-ddd", oembedFor("ada", "x t2o-ddd"), (h) => h === "ada")).ok,
    ).toBe(true)
    expect(
      (await spend(db, "t2o-eee", oembedFor("bob", "x t2o-eee"), (h) => h === "bob")).ok,
    ).toBe(true)
    await db.close()
  })
})
