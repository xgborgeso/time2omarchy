import type { DayCount, TimeBucket } from "./stats"

export type BoardEntry = {
  rank: number
  handle: string
  timeSeconds: number
  bootScreenUrl: string
  /** Proven to belong to its handle, not merely typed. */
  verified: boolean
  /** Optional hardware; null when the ranker did not say. */
  cpuId: string | null
  ramGb: number | null
  storage: string | null
  createdAt: string
  updatedAt: string
}

export type ActivityItem = {
  handle: string
  timeSeconds: number
  updatedAt: string
}

export type Counters = {
  fastestSeconds: number | null
  leaderHandle: string | null
  /** How many entries share rank 1; ties are common at second granularity. */
  leaderCount: number
  entries: number
  visitorsToday: number
  online: number
}

export type BoardResponse = {
  entries: BoardEntry[]
  activity: ActivityItem[]
  counters: Counters
}

export type StatsResponse = {
  distribution: TimeBucket[]
  daily: DayCount[]
  entries: number
  fastestSeconds: number | null
  medianSeconds: number | null
  meanSeconds: number | null
  visitorsToday: number
  viewsToday: number
  rankedToday: number
  online: number
}

export type RankSuccess = {
  ok: true
  created: boolean
  improved: boolean
  keptBest: boolean
  bestTimeSeconds: number
  entry: BoardEntry
  board: BoardResponse
}

export type RankFailure = {
  ok: false
  error: string
  field?: "handle" | "time" | "bootScreen" | "form"
  /** The handle is taken and only proof of ownership can move it. */
  needsProof?: boolean
}

export type ClaimIssued = {
  ok: true
  nonce: string
  /** The exact text that has to appear in the post. */
  text: string
  expiresAt: string
}
