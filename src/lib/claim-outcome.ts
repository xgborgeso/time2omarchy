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
  // Leads with what was won, then with what it buys: the mark is the reward,
  // and being the only one who can change the entry is the lasting part. The
  // wording matches the rules page, which promises exactly this.
  if (result?.ok) {
    return { ok: true, message: `Verified — @${target} is yours to update` }
  }
  return {
    ok: false,
    // Null means the request itself failed — a rate limit, or no network.
    message: result?.error ?? "Could not reach the board. Try again in a moment.",
  }
}
