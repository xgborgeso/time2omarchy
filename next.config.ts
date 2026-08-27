import type { NextConfig } from "next"

const config: NextConfig = {
  // The Hono app and Drizzle both reach for node built-ins, and PGlite writes
  // to disk in local development, so the API cannot run on the edge runtime.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
}

export default config
