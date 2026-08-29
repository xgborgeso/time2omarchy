import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { cacheHeaders } from "@/lib/cache-control"
import { clientKeyFrom } from "@/lib/ratelimit"
import { TRUSTED_IP_HEADER } from "@/server/env"
import { captureError } from "@/server/report"
import type { Context } from "@/server/trpc/init"
import { appRouter } from "@/server/trpc/router"

// PGlite writes to disk and Drizzle reaches for node built-ins.
export const runtime = "nodejs"

function handler(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders }): Context => ({
      headers: req.headers,
      clientKey: clientKeyFrom(req.headers, { trustedHeader: TRUSTED_IP_HEADER }),
      resHeaders,
      secure: new URL(req.url).protocol === "https:",
    }),
    // The browser is told only that something went wrong — see `formatError`.
    // The cause still has to reach the platform log, or a failure nobody can
    // see is also a failure nobody can fix.
    onError: ({ error }) => {
      void captureError(error)
    },
    // The reads are the same for everyone, and every open tab asks for the
    // board every ten seconds. Without this the origin answers all of them.
    responseMeta: ({ paths, type, errors }) => ({
      headers: cacheHeaders(paths ?? [], { type, hasErrors: errors.length > 0 }),
    }),
  })
}

export { handler as GET, handler as POST }
