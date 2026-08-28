/** Keep the fastest time. Equal times replace so the boot screen can be refreshed. */
export function shouldReplace(
  existingSeconds: number | null | undefined,
  incomingSeconds: number,
): boolean {
  if (existingSeconds == null) return true
  return incomingSeconds <= existingSeconds
}

export type Claimant = {
  timeSeconds: number
  verified: boolean
}

/**
 * What an incoming entry is allowed to do to the entry already holding its handle.
 *
 * Ownership of a handle is only established by verifying it. Until then a
 * handle is just a string someone typed, so an unverified entry may open one
 * but never modify one — otherwise anyone could overwrite anyone's entry by
 * typing their handle and a faster time. A verified entry claims an unverified
 * one outright, so squatting an early entry buys nothing.
 */
export type EntryDecision = "create" | "replace" | "claim" | "keep" | "reject"

export function decideEntry(existing: Claimant | null, incoming: Claimant): EntryDecision {
  if (!existing) return "create"
  if (!incoming.verified) return "reject"
  if (!existing.verified) return "claim"
  return shouldReplace(existing.timeSeconds, incoming.timeSeconds) ? "replace" : "keep"
}

/** The shape the board needs to place an entry. */
export type Rankable = {
  timeSeconds: number
  verified: boolean
  /** ISO 8601, so lexical order is chronological order. */
  createdAt: string
}

/**
 * Places entries on the board using dense ranking: an equal time is an equal
 * rank and no number is skipped, so two firsts are followed by second and the
 * last rank equals the number of distinct times on the board.
 *
 * The rank number is a function of time and nothing else — Rule 01 stays true.
 * Proof only decides who is listed first among equals, which is what makes the
 * badge worth earning without ever letting a slower verified entry outrank a
 * faster unverified one.
 */
export function rankEntries<T extends Rankable>(
  entries: readonly T[],
): (T & { rank: number })[] {
  const sorted = [...entries].sort(
    (a, b) =>
      a.timeSeconds - b.timeSeconds ||
      Number(b.verified) - Number(a.verified) ||
      a.createdAt.localeCompare(b.createdAt),
  )

  let rank = 0
  let previousTime: number | null = null
  return sorted.map((entry) => {
    if (entry.timeSeconds !== previousTime) {
      rank += 1
      previousTime = entry.timeSeconds
    }
    return { ...entry, rank }
  })
}
