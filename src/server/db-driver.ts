/**
 * Which database this process should open.
 *
 * Kept apart from the opening itself so the decision is testable: the one
 * outcome that must never happen quietly is a deployed instance falling back
 * to the local file.
 */
export type Driver = "postgres" | "pglite"

export function chooseDriver({
  databaseUrl,
  isProduction,
}: {
  databaseUrl: string | null
  isProduction: boolean
}): Driver {
  if (databaseUrl) return "postgres"

  if (isProduction) {
    // PGlite writes to a local directory. Deployed, that disk is ephemeral and
    // unshared, so the board would reset on every restart and disagree between
    // instances — all without a single error to notice.
    throw new Error("DATABASE_URL is required in production.")
  }

  return "pglite"
}
