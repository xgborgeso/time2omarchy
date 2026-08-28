/**
 * The line under the hero number.
 *
 * With no label above the number, this is the only place that says what the
 * board measures, so every branch names Omarchy and ends with something to do.
 *
 * Split rather than returned whole: the leader is a real person, and their
 * handle has to become a link out to X — flat prose is a dead end for anyone
 * who wants to see who just beat them.
 */
export type HeroSubline = {
  before: string
  /** The sole leader, without the @. Null when nobody holds the top alone. */
  handle: string | null
  after: string
}

export function heroSubline(leaderHandle: string | null, leaderCount: number): HeroSubline {
  if (leaderCount > 1) {
    // Naming one of several holders would read as though the rest did not count.
    return {
      before: `The fastest Omarchy install. ${leaderCount} share it — rank yours and break the tie.`,
      handle: null,
      after: "",
    }
  }
  if (leaderHandle) {
    return {
      before: "The fastest Omarchy install. ",
      handle: leaderHandle,
      after: " holds it — rank yours and take it.",
    }
  }
  return {
    before: "No Omarchy install ranked yet. Rank yours and open the board.",
    handle: null,
    after: "",
  }
}
