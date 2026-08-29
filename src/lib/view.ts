/** The three top-level containers. Each is a hash away, so each is shareable. */
const VIEWS = ["board", "stats", "rules"] as const

export type View = (typeof VIEWS)[number]

function isView(value: string): value is View {
  return (VIEWS as readonly string[]).includes(value)
}

export function viewFromHash(hash: string): View {
  const name = hash.replace(/^#/, "")
  return isView(name) ? name : "board"
}

/** The board is the bare url, so leaving it clears the hash rather than setting one. */
export function hashForView(view: View): string {
  return view === "board" ? "" : `#${view}`
}
