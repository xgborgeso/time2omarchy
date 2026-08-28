/**
 * The line under the hero number.
 *
 * One line, whatever the board holds. It used to name the leader, or count
 * them when several tied — but ties are the normal case at second
 * granularity, and "3 share it" reads as a hedge rather than a headline. The
 * leader's handle is already an X link on the first entry, so crediting them
 * here only said it twice.
 *
 * With no label above the number this is the only place that says what the
 * board measures, so it names Omarchy and ends with something to do.
 */
export function heroSubline(): string {
  return "The fastest Omarchy install leaderboard. Rank yours."
}
