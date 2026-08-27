const HANDLE_RE = /^[a-z0-9_]{1,15}$/

/** Strip @, lowercase, collapse whitespace. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase()
}

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle)
}

export function xUrl(handle: string): string {
  return `https://x.com/${handle}`
}
