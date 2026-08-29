import { IS_PRODUCTION } from "./env"

/**
 * Where server-side errors go.
 *
 * The platform log, and nothing else. On a deployment stderr *is* the logging
 * interface — there is no other channel without an agent — so this is not a
 * stray `console.error` but the one place the app speaks to it.
 *
 * Every call site already awaits this, so a reporting service later is a
 * change to this file alone. That is why it is a function at all rather than a
 * `console.error` scattered through the codebase.
 */

/**
 * Deliberately three fields.
 *
 * Passing the error object straight to the console prints everything it
 * happens to carry, and a `DrizzleQueryError` carries `query` and `params` —
 * the values somebody just submitted, written to a log that is awkward to
 * redact after the fact. Naming the fields means adding one is a decision.
 */
type Report = {
  level: "error"
  name: string
  message: string
  stack?: string
}

export async function captureError(err: unknown): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err))
  const report: Report = {
    level: "error",
    name: error.name,
    message: error.message,
    stack: error.stack,
  }

  // One JSON line where something might parse it, and a readable stack where a
  // person is watching. Same fields either way.
  if (IS_PRODUCTION) {
    console.error(JSON.stringify(report))
    return
  }
  console.error(`[${report.name}] ${report.message}\n${report.stack ?? ""}`)
}
