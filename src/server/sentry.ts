/**
 * Where server-side errors go.
 *
 * Console only, deliberately: there is no error-reporting service wired up
 * yet. Every call site already awaits this, so swapping in a real reporter
 * later is a change to this file alone.
 */
export async function captureError(err: unknown): Promise<void> {
  console.error(err)
}
