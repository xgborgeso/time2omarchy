/**
 * The optional hardware an entry can carry.
 *
 * Fixed options rather than free text: the reason to collect this at all is to
 * aggregate it, and "average install on a Ryzen 9" cannot be answered if
 * everyone writes the model differently.
 */
import { z } from "zod"
import { CPU_IDS, cpuById, cpuLabel } from "./cpus"

/** Sizes people actually have, not every number. */
export const RAM_OPTIONS = [8, 16, 24, 32, 48, 64, 96, 128] as const

/**
 * Fastest first — this is a speed leaderboard, so the order is the point.
 *
 * The two SSDs name their interface rather than saying plain "SSD": an NVMe
 * drive is also an SSD, so a bare "SSD" option would collect both.
 */
export const STORAGE = [
  { id: "nvme", label: "NVMe SSD" },
  { id: "ssd", label: "SATA SSD" },
  { id: "hdd", label: "HDD" },
] as const

export type StorageId = (typeof STORAGE)[number]["id"]

const STORAGE_IDS = STORAGE.map((s) => s.id) as [StorageId, ...StorageId[]]

export function storageLabel(id: string): string | null {
  return STORAGE.find((s) => s.id === id)?.label ?? null
}

export const specsSchema = z.object({
  cpuId: z.enum(CPU_IDS as [string, ...string[]]).optional(),
  ramGb: z
    .number()
    .int()
    .refine((n) => (RAM_OPTIONS as readonly number[]).includes(n), "Pick an offered size")
    .optional(),
  storage: z.enum(STORAGE_IDS).optional(),
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
    cpu ? cpuLabel(cpu) : null,
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
  const parts = [cpu?.name ?? null, ramGb ? `${ramGb}GB` : null].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}
