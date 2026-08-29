import { defineConfig } from "drizzle-kit"

/**
 * Whichever database this invocation is meant for.
 *
 * Prefers the unpooled endpoint where the host offers one. Migrations are DDL
 * and take advisory locks, and a transaction pooler hands out a different
 * backend per statement — Neon publishes both urls for exactly this reason.
 *
 * Hardcoding the local file here was a deploy-shaped trap: `db:migrate` would
 * run against a PGlite directory inside the build container, report success,
 * and leave the real Postgres without a single table — a green build and a site
 * that fails on its first query.
 *
 * `db:generate` needs no connection at all, so it works either way.
 */
const url = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim()

export default defineConfig(
  url
    ? {
        schema: "./src/server/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        dbCredentials: { url },
      }
    : {
        schema: "./src/server/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        driver: "pglite",
        dbCredentials: { url: "./data/dev" },
      },
)
