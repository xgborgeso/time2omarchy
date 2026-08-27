import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
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
      resHeaders,
      secure: new URL(req.url).protocol === "https:",
    }),
  })
}

export { handler as GET, handler as POST }
