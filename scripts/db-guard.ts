/**
 * Refuses to continue while something else holds the local database.
 *
 * Exists as its own entry point so a shell command can gate on it:
 * `tsx scripts/db-guard.ts && rm -rf data/dev`. Scripts that open the
 * database themselves get the same check inside `openDatabase`.
 */
import path from "node:path"
import { assertDatabaseFree } from "../src/server/db-lock"

assertDatabaseFree(path.resolve("data/dev"), process.argv[2] ?? "running this")
