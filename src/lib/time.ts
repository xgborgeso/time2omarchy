/**
 * A floor against nonsense, not against being fast.
 *
 * The hero quotes the fastest time on the board, so a 0s or 1s entry becomes
 * the headline the moment it lands and the whole site reads as broken until
 * someone reports it. Below five seconds nothing has installed — that is a
 * typo or a joke, and it is the one case worth refusing outright.
 */
export const MIN_SECONDS = 5

/**
 * A sanity bound, not a rule.
 *
 * This was fifteen minutes, which excluded real installs: a spinning disk on
 * slow wifi genuinely runs longer, and those are exactly the entries the
 * hardware benchmark needs — refusing them biased every median toward fast
 * machines and made "by drive" look better than it is. A day is far past
 * anything real and still catches a mistyped 999999.
 */
export const MAX_SECONDS = 24 * 60 * 60

/**
 * Parse flexible install-time strings into integer seconds.
 * Accepts 43, 43s, 1:12, 01:12, 1m12s, 1m 12s, 2m, 1.5m, 1h, 1:01:02.
 */
export function parseTime(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/,/g, ".")
  if (!raw) return null

  const colon = raw.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/)
  if (colon) {
    const hoursOrMin = Number(colon[1])
    const mid = Number(colon[2])
    if (colon[3] != null) {
      return hoursOrMin * 3600 + mid * 60 + Number(colon[3])
    }
    return hoursOrMin * 60 + mid
  }

  const compact = raw.replace(/\s+/g, "")
  if (/[hms]/.test(compact)) {
    const named = compact.match(
      /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/,
    )
    if (named && named[0].length > 0) {
      const h = named[1] ? Number(named[1]) : 0
      const m = named[2] ? Number(named[2]) : 0
      const s = named[3] ? Number(named[3]) : 0
      if (h === 0 && m === 0 && s === 0 && !/[hms]/.test(compact)) return null
      return Math.round(h * 3600 + m * 60 + s)
    }
    return null
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Math.round(Number(raw))
  }

  return null
}

export function isTimeInRange(seconds: number): boolean {
  return Number.isInteger(seconds) && seconds >= MIN_SECONDS && seconds <= MAX_SECONDS
}

/** Board display: 43s under a minute, 1:12 otherwise. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—"
  const whole = Math.round(seconds)
  if (whole < 60) return `${whole}s`
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

export function relativeTime(date: Date | string, now = Date.now()): string {
  const t = typeof date === "string" ? new Date(date).getTime() : date.getTime()
  if (!Number.isFinite(t)) return ""
  const delta = Math.max(0, now - t)
  const s = Math.floor(delta / 1000)
  if (s < 8) return "just now"
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days === 1) return "yesterday"
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}
