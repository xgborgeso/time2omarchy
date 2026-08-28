import type { Benchmark } from "./benchmark"
import type { DayCount, TimeBucket } from "./stats"

export type BoardEntry = {
  rank: number
  handle: string
  timeSeconds: number
  bootScreenUrl: string
  /** Proven to belong to its handle, not merely typed. */
  verified: boolean
  /** Required hardware — every entry carries a machine. */
  cpuId: string
  ramGb: number
  storage: string
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
  /** Which page these entries are, and how many entries exist behind them. */
  page: number
  perPage: number
  total: number
}

export type StatsResponse = {
  distribution: TimeBucket[]
  /** Install time against the hardware it ran on. */
  hardware: Benchmark
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
  /** The handle is taken; only its owner, signed in, can move it. */
  needsSignIn?: boolean
}
