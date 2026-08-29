import { BETTERSTACK_HOST, BETTERSTACK_TOKEN, IS_PRODUCTION } from "./env"

/**
 * Where server-side errors go.
 *
 * Better Stack when it is configured, the console otherwise — which is what
 * development wants and what a deployment falls back to if the token is
 * missing. Every call site already awaits this, so the reporter is a change to
 * this file alone; that was the point of leaving it a stub.
 *
 * Server-side only, deliberately. Every error worth waking up for lives here:
 * the metered X call refusing, the database unreachable, an upload failing.
 * A browser SDK would put weight in the bundle for errors nobody acts on.
 */

/** Never let reporting an error become an error. */
async function send(body: Record<string, unknown>): Promise<void> {
  if (!BETTERSTACK_TOKEN || !BETTERSTACK_HOST) return
  try {
    await fetch(`https://${BETTERSTACK_HOST}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${BETTERSTACK_TOKEN}`,
      },
      body: JSON.stringify(body),
      // A hung reporter must not hold a request open. Losing the report is
      // the cheaper failure.
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Deliberately silent: this is already the error path.
  }
}

export async function captureError(err: unknown): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err))

  // Kept in production too. The platform log is the one place that still has
  // it when the network to Better Stack is the thing that is broken.
  console.error(error)

  await send({
    dt: new Date().toISOString(),
    level: "error",
    message: error.message,
    stack: error.stack,
    // Alert rules match on this rather than on free text.
    app: "time2omarchy",
    env: IS_PRODUCTION ? "production" : "development",
  })
}
