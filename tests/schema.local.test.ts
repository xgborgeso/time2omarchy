import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { PGlite } from "@electric-sql/pglite"
import { describe, expect, it } from "vitest"
import { openDatabase } from "../src/server/pglite"

/** Migrated, in-memory, thrown away afterwards. */
async function freshDb(): Promise<PGlite> {
  const { client } = await openDatabase()
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
        // Takedowns are read on every board query, so the flag is indexed.
        "(hidden_at)",
        "UNIQUE (handle)",
        "UNIQUE (id)",
        "UNIQUE (identity_key)",
        // drizzle-kit emits NULLS LAST; updated_at is NOT NULL, so it never applies.
        "(updated_at DESC NULLS LAST)",
      ].sort(),
    )
    await client.close()
  })

  it("re-opening an existing database keeps its data and its schema", async () => {
    // The server opens the database on every boot. The migration journal is
    // what stops that re-running DDL over live rows.
    const dir = await mkdtemp(path.join(tmpdir(), "t2o-schema-"))
    try {
      const first = await openDatabase(dir)
      await first.client.query(
        "INSERT INTO entries (handle, time_seconds, boot_screen_url, identity_key," +
          " cpu_id, ram_gb, storage)" +
          " VALUES ('kept', 43, '/a.png', 'x:kept', 'other', 16, 'ssd')",
      )
      await first.client.close()

      const second = await openDatabase(dir)
      const rows = await second.client.query<{ handle: string }>(
        "SELECT handle FROM entries",
      )
      expect(rows.rows.map((r) => r.handle)).toEqual(["kept"])
      expect((await indexesOn(second.client, "entries")).length).toBe(6)
      await second.client.close()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }, 30_000)

  it("refuses a row with no account behind it", async () => {
    // Ranking goes through X, so identity_key is the one column that proves an
    // entry is somebody's. A nullable one would let a guest row back in.
    const client = await freshDb()
    await expect(
      client.query(
        "INSERT INTO entries (handle, time_seconds, boot_screen_url, cpu_id, ram_gb, storage)" +
          " VALUES ('a', 43, '/a.png', 'other', 16, 'ssd')",
      ),
    ).rejects.toThrow(/identity_key/)
    await client.close()
  })
})
