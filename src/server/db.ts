import path from "node:path"
import { type Database, openDatabase } from "./pglite"

export type Db = Database

const LOCAL_PG_DIR = path.resolve("data/dev")

let cached: Promise<Db> | null = null

export function getDb(): Promise<Db> {
  if (!cached) {
    cached = openDatabase(LOCAL_PG_DIR)
      .then(({ db }) => db)
      .catch((err) => {
        cached = null
        throw err
      })
  }
  return cached
}
