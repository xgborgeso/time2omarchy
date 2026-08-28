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
}

/**
 * What an incoming entry is allowed to do to the entry already holding its handle.
 *
 * Ranking goes through X, so a handle is never a string someone typed — the
 * only person who can reach an entry is the account that owns it. That leaves
 * one question: whether the new time beats the old one.
 */
export type EntryDecision = "create" | "replace" | "keep"

export function decideEntry(
  existing: Contender | null,
  incoming: Contender,
): EntryDecision {
  if (!existing) return "create"
  return shouldReplace(existing.timeSeconds, incoming.timeSeconds) ? "replace" : "keep"
}

/** The shape the board needs to place an entry. */
export type Rankable = {
  timeSeconds: number
  /** ISO 8601, so lexical order is chronological order. */
  createdAt: string
}

/**
 * Places entries on the board using dense ranking: an equal time is an equal
 * rank and no number is skipped, so two firsts are followed by second and the
 * last rank equals the number of distinct times on the board.
 *
 * The rank number is a function of time and nothing else — Rule 01 stays true.
 * Equal times are listed oldest first, so getting there first is worth
 * something without ever letting it change the number beside a name.
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
    (a, b) => a.timeSeconds - b.timeSeconds || a.createdAt.localeCompare(b.createdAt),
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
