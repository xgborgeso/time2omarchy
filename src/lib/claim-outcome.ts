/**
 * What to tell someone after a claim came back from X.
 *
 * Separated from the component so the wording is testable: the server's own
 * sentence names both accounts, and losing it to a generic fallback is exactly
 * the failure that made a refused claim look like a broken button.
 */
export type ClaimResult = { ok: true } | { ok: false; error?: string } | null

export type ClaimOutcome = { ok: boolean; message: string }

export function claimOutcome(target: string, result: ClaimResult): ClaimOutcome {
  if (result?.ok) return { ok: true, message: `@${target} is verified` }
  return {
    ok: false,
    // Null means the request itself failed — a rate limit, or no network.
    message: result?.error ?? "Could not reach the board. Try again in a moment.",
  }
}
