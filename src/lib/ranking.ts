/** Keep the fastest time. Equal times replace so the boot screen can be refreshed. */
export function shouldReplace(
  existingSeconds: number | null | undefined,
  incomingSeconds: number,
): boolean {
  if (existingSeconds == null) return true
  return incomingSeconds <= existingSeconds
}

export type Contender = {
  timeSeconds: number
  verified: boolean
}

/**
 * What an incoming entry is allowed to do to the entry already holding its handle.
 *
 * Ownership of a handle is only established by verifying it. Until then a
 * handle is just a string someone typed, so an unverified entry may open one
 * but never modify one — otherwise anyone could overwrite anyone's entry by
 * typing their handle and a faster time. A verified entry takes over an
 * unverified one outright, so squatting an early entry buys nothing.
 */
export type EntryDecision = "create" | "replace" | "takeover" | "keep" | "reject"

export function decideEntry(
  existing: Contender | null,
  incoming: Contender,
): EntryDecision {
  if (!existing) return "create"
  if (!incoming.verified) return "reject"
  if (!existing.verified) return "takeover"
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
  /**
   * The rank the first entry holds on the whole board.
   *
   * A page of results is a slice, and a slice ranked on its own restarts at #1
   * every page. The caller counts how many distinct faster times exist and
   * passes the rank that follows them.
   */
  startRank = 1,
): (T & { rank: number })[] {
  const sorted = [...entries].sort(
    (a, b) =>
      a.timeSeconds - b.timeSeconds ||
      Number(b.verified) - Number(a.verified) ||
      a.createdAt.localeCompare(b.createdAt),
  )

  let rank = startRank - 1
  let previousTime: number | null = null
  return sorted.map((entry) => {
    if (entry.timeSeconds !== previousTime) {
      rank += 1
      previousTime = entry.timeSeconds
    }
    return { ...entry, rank }
  })
}
