import { formatTime } from "./time"

/** Passed to X without the leading "#", which X adds itself. */
export const SHARE_HASHTAGS = ["time2omarchy", "omarchy"] as const

const SITE_URL = "https://time2omarchy.com"

const INTENT_URL = "https://x.com/intent/post"

export type BoardPosition = {
  rank: number
  timeSeconds: number
  total: number
}

/**
 * The tweet body. X appends the url and hashtags after this text, so it stays
 * short enough to leave them room.
 */
export function shareText({ rank, timeSeconds, total }: BoardPosition): string {
  const time = formatTime(timeSeconds)
  if (rank === 1) {
    return `Just took #1 on the Omarchy install leaderboard — ${time}.`
  }
  return `#${rank} of ${total.toLocaleString("en-US")} on the Omarchy install leaderboard — ${time}.`
}

export function shareIntentUrl(position: BoardPosition): string {
  const params = new URLSearchParams({
    text: shareText(position),
    url: SITE_URL,
    hashtags: SHARE_HASHTAGS.join(","),
  })
  return `${INTENT_URL}?${params.toString()}`
}
