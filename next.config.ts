import type { NextConfig } from "next"

const config: NextConfig = {
  // The Hono app and Drizzle both reach for node built-ins, and PGlite writes
  // to disk in local development, so the API cannot run on the edge runtime.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // X refuses to register a `localhost` callback, so signing in has to happen
  // on 127.0.0.1 — which Next treats as a foreign host and blocks from its own
  // dev resources, leaving the page rendered but never hydrated. Dev only.
  allowedDevOrigins: ["127.0.0.1"],
}

export default config
