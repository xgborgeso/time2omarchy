import type { BoardPosition } from "./share"

/**
 * What to tell someone after a verify came back from X.
 *
 * Separated from the component so the wording is testable: the server's own
 * sentence names both accounts, and losing it to a generic fallback is exactly
 * the failure that made a refused verify look like a broken button.
 */
export type VerifyResult =
  | { ok: true; entry?: { rank: number; timeSeconds: number }; total?: number }
  | { ok: false; error?: string }
  | null

export type VerifyOutcome = {
  ok: boolean
  message: string
  /**
   * What to put in the tweet, present only once the entry is proven.
   *
   * Verifying is the single moment where the account is known and fresh — the
   * redirect back from X has already discarded the form — so the offer to
   * share has to be attached here or it has nowhere else to live.
   */
  position: BoardPosition | null
}

export function verifyOutcome(result: VerifyResult): VerifyOutcome {
  // Leads with what was won, then with what it buys: the mark is the reward,
  // and being the only one who can change the entry is the lasting part. The
  // wording matches the rules page, which promises exactly this.
  // One word: the check mark has just appeared on the entry, so the toast
  // only has to confirm it landed.
  if (result?.ok) {
    const { entry, total } = result
    return {
      ok: true,
      message: "Verified",
      // Absent only if the server answered without the entry, which no live
      // path does; the toast then simply carries no share.
      position:
        entry && total != null
          ? { rank: entry.rank, timeSeconds: entry.timeSeconds, total }
          : null,
    }
  }
  return {
    ok: false,
    // Null means the request itself failed — a rate limit, or no network.
    message: result?.error ?? "Could not reach the board. Try again in a moment.",
    position: null,
  }
}
