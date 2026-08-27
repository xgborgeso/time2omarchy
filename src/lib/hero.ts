/**
 * The line under the hero number.
 *
 * With no label above the number, this is the only place that says what the
 * board measures, so every branch names Omarchy and ends with something to do.
 */
export function heroSubline(leaderHandle: string | null, leaderCount: number): string {
  if (leaderCount > 1) {
    // Naming one of several holders would read as though the rest did not count.
    return `The fastest Omarchy install. ${leaderCount} share it — rank yours and break the tie.`
  }
  if (leaderHandle) {
    return `The fastest Omarchy install. @${leaderHandle} holds it — rank yours and take it.`
  }
  return "No Omarchy install ranked yet. Rank yours and open the board."
}
