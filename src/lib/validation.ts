import { z } from "zod"
import { isValidHandle, normalizeHandle } from "./handle"
import { isTimeInRange, parseTime } from "./time"

export const MAX_BOOT_SCREEN_BYTES = 4 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const

export const handleSchema = z
  .string()
  .trim()
  .min(1, "Add an X handle")
  .transform(normalizeHandle)
  .refine(isValidHandle, "Handles are 1–15 letters, numbers, or underscores")

export const timeSchema = z
  .string()
  .trim()
  .min(1, "Add a time")
  .transform((value, ctx) => {
    const seconds = parseTime(value)
    if (seconds === null) {
      ctx.addIssue({
        code: "custom",
        message: "Could not parse that time. Try 43s or 1:12",
      })
      return z.NEVER
    }
    if (!isTimeInRange(seconds)) {
      ctx.addIssue({
        code: "custom",
        message: "Time must be between 15s and 15:00",
      })
      return z.NEVER
    }
    return seconds
  })

/**
 * The one thing wrong with a typed time, or null if nothing is.
 *
 * The form checks before uploading — a missing time should not cost a round
 * trip — and reuses the schema rather than restating its rules, so the two can
 * never drift apart.
 */
export function timeError(input: string): string | null {
  const result = timeSchema.safeParse(input)
  return result.success ? null : (result.error.issues[0]?.message ?? "Add a time")
}

export const metadataSchema = z.object({
  handle: handleSchema,
  time: timeSchema,
})

export type BootScreenIssue = { field: "bootScreen"; error: string }

export function validateBootScreen(
  file: File | Blob | null | undefined,
): BootScreenIssue | null {
  if (!file || !(file instanceof Blob) || file.size === 0) {
    return { field: "bootScreen", error: "Add a boot screen" }
  }
  const type = "type" in file ? file.type : ""
  if (type && !ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { field: "bootScreen", error: "Use a png, jpg, webp, gif, or avif" }
  }
  if (file.size > MAX_BOOT_SCREEN_BYTES) {
    return { field: "bootScreen", error: "Boot screen must be 4 MB or smaller" }
  }
  return null
}
