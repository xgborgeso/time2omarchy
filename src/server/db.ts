import path from "node:path"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { chooseDriver } from "./db-driver"
import { IS_PRODUCTION } from "./env"
import { type Database, openDatabase } from "./pglite"
import * as schema from "./schema"

export type Db = Database

const LOCAL_PG_DIR = path.resolve("data/dev")

const DATABASE_URL = process.env.DATABASE_URL?.trim() || null

let cached: Promise<Db> | null = null

/**
 * The database, opened once per process.
 *
 * Postgres wherever a url is set, the local PGlite file otherwise. The schema
 * is Postgres dialect either way, so nothing above this line knows which it
 * got — which is the whole reason the local one is real Postgres.
 */
export function getDb(): Promise<Db> {
  if (!cached) {
    cached = open().catch((err) => {
      cached = null
      throw err
    })
  }
  return cached
}

async function open(): Promise<Db> {
  const driver = chooseDriver({ databaseUrl: DATABASE_URL, isProduction: IS_PRODUCTION })

  if (driver === "postgres") {
    // One connection per instance: serverless runs many instances and a pool
    // per instance is how a database runs out of connections.
    const sql = postgres(DATABASE_URL as string, { max: 1, prepare: false })
    // Deliberately no migrate() here — see `npm run db:migrate`. Cold starts
    // are concurrent, and concurrent migrations race each other.
    return drizzlePostgres(sql, { schema }) as unknown as Db
  }

  const { db } = await openDatabase(LOCAL_PG_DIR)
  return db
}
