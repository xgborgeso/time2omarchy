import type { BoardPosition } from "./share"

/**
 * What to tell someone after a verify came back from X.
 *
 * Separated from the component so the wording is testable: the server's own
 * sentence names both accounts, and losing it to a generic fallback is exactly
 * the failure that made a refused verify look like a broken button.
 */
export type VerifyResult =
  | {
      ok: true
      entry?: { handle: string; rank: number; timeSeconds: number }
      total?: number
    }
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
  // A whole sentence in the second person, the way every refusal beside it is
  // written — "Verified" alone was the one message on the site in a different
  // voice. It names the account, because proving which account is the point,
  // and then points at the button rather than explaining a rule.
  if (result?.ok) {
    const { entry, total } = result
    // Absent only if the server answered without the entry, which no live
    // path does; the toast then simply carries no share.
    const position =
      entry && total != null
        ? { rank: entry.rank, timeSeconds: entry.timeSeconds, total }
        : null
    const named = entry ? `@${entry.handle} is verified.` : "Verified."
    return {
      ok: true,
      // The invitation is only honest when there is something to press.
      message: position ? `${named} Go tell them.` : named,
      position,
    }
  }
  return {
    ok: false,
    // Null means the request itself failed — a rate limit, or no network.
    message: result?.error ?? "Could not reach the board. Try again in a moment.",
    position: null,
  }
}
