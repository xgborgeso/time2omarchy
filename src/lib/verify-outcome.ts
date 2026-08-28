/**
 * What to tell someone after a verify came back from X.
 *
 * Separated from the component so the wording is testable: the server's own
 * sentence names both accounts, and losing it to a generic fallback is exactly
 * the failure that made a refused verify look like a broken button.
 */
export type VerifyResult = { ok: true } | { ok: false; error?: string } | null

export type VerifyOutcome = { ok: boolean; message: string }

export function verifyOutcome(result: VerifyResult): VerifyOutcome {
  // Leads with what was won, then with what it buys: the mark is the reward,
  // and being the only one who can change the entry is the lasting part. The
  // wording matches the rules page, which promises exactly this.
  // One word: the check mark has just appeared on the entry, so the toast
  // only has to confirm it landed.
  if (result?.ok) return { ok: true, message: "Verified" }
  return {
    ok: false,
    // Null means the request itself failed — a rate limit, or no network.
    message: result?.error ?? "Could not reach the board. Try again in a moment.",
  }
}
