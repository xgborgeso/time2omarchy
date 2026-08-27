import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { describe, expect, it } from "vitest"

/** Applies the real schema to a throwaway in-process Postgres. */
async function freshDb() {
  const client = new PGlite()
  await client.waitReady
  await client.exec(await readFile("drizzle/0000_init.sql", "utf8"))
  return client
}

async function indexesOn(client: PGlite, table: string): Promise<string[]> {
  const res = await client.query<{ indexdef: string }>(
    "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1",
    [table],
  )
  // Compare by the columns covered, not the generated index name.
  return res.rows
    .map((r) => r.indexdef.replace(/^CREATE (UNIQUE )?INDEX \S+ ON \S+ USING btree /, "$1"))
    .sort()
}

describe("schema", () => {
  it("indexes entries exactly once per access path", async () => {
    const client = await freshDb()
    expect(await indexesOn(client, "entries")).toEqual(
      [
        "(time_seconds)",
        "UNIQUE (handle)",
        "UNIQUE (id)",
        "UNIQUE (identity_key)",
        "(updated_at DESC)",
      ].sort(),
    )
    await client.close()
  })

  it("replays cleanly, since the server applies it on every boot", async () => {
    const client = await freshDb()
    const sql = await readFile("drizzle/0000_init.sql", "utf8")
    await client.exec(sql)
    await client.exec(sql)
    expect((await indexesOn(client, "entries")).length).toBe(5)
    await client.close()
  })

  it("keeps identity_key nullable so unverified rows can coexist", async () => {
    const client = await freshDb()
    await client.query(
      "INSERT INTO entries (handle, time_seconds, boot_screen_url) VALUES ('a', 43, '/a.png'), ('b', 51, '/b.png')",
    )
    const res = await client.query<{ n: number }>("SELECT count(*)::int AS n FROM entries")
    expect(res.rows[0]?.n).toBe(2)
    await client.close()
  })
})
