import { getAuth } from "@/server/auth"

// PGlite writes to disk and Drizzle reaches for node built-ins.
export const runtime = "nodejs"

async function handler(req: Request): Promise<Response> {
  // The instance is built per process, not per request; getAuth caches it.
  const auth = await getAuth()
  return auth.handler(req)
}

export { handler as GET, handler as POST }
