/**
 * The optional hardware an entry can carry.
 *
 * Fixed options rather than free text: the reason to collect this at all is to
 * aggregate it, and "average install on a Ryzen 9" cannot be answered if
 * everyone writes the model differently.
 */
import { z } from "zod"
import { CPU_IDS, cpuById, cpuLabel, OTHER_CPU_ID } from "./cpus"

export { OTHER_CPU_ID }

/** Sizes people actually have, not every number. */
export const RAM_OPTIONS = [8, 16, 24, 32, 48, 64, 96, 128] as const

/**
 * Fastest first — this is a speed leaderboard, so the order is the point.
 *
 * Named by interface, since that is the distinction that matters. "NVMe SSD"
 * would say it twice — NVMe is only ever an SSD. "SATA" alone would not be
 * enough, because SATA hard drives exist, so that one keeps its qualifier.
 */
export const STORAGE = [
  { id: "nvme", label: "NVMe" },
  { id: "ssd", label: "SATA SSD" },
  { id: "hdd", label: "HDD" },
] as const

export type StorageId = (typeof STORAGE)[number]["id"]

const STORAGE_IDS = STORAGE.map((s) => s.id) as [StorageId, ...StorageId[]]

export function storageLabel(id: string): string | null {
  return STORAGE.find((s) => s.id === id)?.label ?? null
}

/**
 * All three are required.
 *
 * Install time is dominated by hardware — reported times range from about 45
 * seconds to over eight minutes — so a time without a machine attached is not
 * comparable to anything, and partial data skews every aggregate built on it.
 *
 * `OTHER_CPU_ID` is accepted so that a chip missing from the catalogue cannot
 * lock someone out. Stats exclude that bucket rather than guessing.
 */
export const specsSchema = z.object({
  cpuId: z.enum([OTHER_CPU_ID, ...CPU_IDS] as [string, ...string[]]),
  ramGb: z
    .number()
    .int()
    .refine((n) => (RAM_OPTIONS as readonly number[]).includes(n), "Pick an offered size"),
  storage: z.enum(STORAGE_IDS),
})

export type Specs = {
  cpuId: string | null
  ramGb: number | null
  storage: string | null
}

/**
 * Specs as one line, or null when there is nothing to say.
 *
 * Tolerates an unknown cpu id: an entry outlives the catalogue, and a chip
 * removed by a careless edit must not blank out someone's row.
 */
export function formatSpecs({ cpuId, ramGb, storage }: Specs): string | null {
  const cpu = cpuId ? cpuById(cpuId) : null
  const parts = [
    cpu ? cpuLabel(cpu) : cpuId === OTHER_CPU_ID ? "Other CPU" : null,
    ramGb ? `${ramGb}GB` : null,
    storage ? storageLabel(storage) : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : null
}

/**
 * Specs compressed for a board row.
 *
 * The vendor and the disk are dropped: a row already carries rank, time,
 * handle, date and a thumbnail, and the model plus memory is the part that
 * makes two times comparable at a glance. The full line is in the lightbox.
 */
export function formatSpecsShort({ cpuId, ramGb }: Specs): string | null {
  const cpu = cpuId ? cpuById(cpuId) : null
  const name = cpu?.name ?? (cpuId === OTHER_CPU_ID ? "Other CPU" : null)
  const parts = [name, ramGb ? `${ramGb}GB` : null].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}
