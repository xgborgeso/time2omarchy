/**
 * Something a person can read, out of whatever was thrown.
 *
 * tRPC reports a failed input schema by putting the entire zod issue array
 * into `message`, and rendering that verbatim showed people
 * `[ { "origin": "string", "code": "too_small", … } ]` where a sentence
 * belonged. Only the first issue matters: it is the field they must fix first.
 */
export function errorText(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : ""
  if (!message) return fallback
  // Anything that is not JSON was written to be read; pass it through.
  if (!message.startsWith("[") && !message.startsWith("{")) return message

  try {
    const parsed: unknown = JSON.parse(message)
    const first = Array.isArray(parsed) ? parsed[0] : parsed
    const text =
      typeof first === "object" && first !== null
        ? (first as { message?: unknown }).message
        : null
    return typeof text === "string" && text ? text : fallback
  } catch {
    return fallback
  }
}
