import type { NextConfig } from "next"

/**
 * Headers every response carries.
 *
 * Vercel sets HSTS and nothing else, so these are the ones nobody sends for
 * you. All of them are refusals — they take capabilities away from the page
 * rather than granting any — which is why they can be applied to the whole
 * site without knowing what each route does.
 *
 * There is deliberately no full `Content-Security-Policy` here. A real one
 * needs a per-request nonce for Next's inline bootstrap and an allowlist for
 * the analytics script and the upload host, and a wrong one fails by breaking
 * the page rather than by warning. `frame-ancestors` is the half that does not
 * need any of that, so it is the half that ships.
 */
const SECURITY_HEADERS = [
  // A board is worth framing: reskin it, overlay it, and the times look like
  // they came from somewhere else. Both names for the same refusal, because
  // `X-Frame-Options` is what older browsers read.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },

  // Boot screens are visitor-supplied files served from a host we do not
  // control. Sniffing lets one of them be interpreted as something other than
  // what it was stored as.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Every entry links out to X. Without this the full url travels with it, and
  // once pagination moves into the query string that url describes what
  // someone was reading.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Nothing here asks for hardware, so nothing should be able to. This is the
  // list of things a page could request silently and never needs to.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
]

const config: NextConfig = {
  // The Hono app and Drizzle both reach for node built-ins, and PGlite writes
  // to disk in local development, so the API cannot run on the edge runtime.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // X refuses to register a `localhost` callback, so signing in has to happen
  // on 127.0.0.1 — which Next treats as a foreign host and blocks from its own
  // dev resources, leaving the page rendered but never hydrated. Dev only.
  allowedDevOrigins: ["127.0.0.1"],
  // `x-powered-by: Next.js` on every response names the framework and so the
  // advisories worth trying. It buys nothing back.
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
}

export default config
