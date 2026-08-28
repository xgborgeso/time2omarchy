import { describe, expect, it } from "vitest"
import { heroSubline } from "@/lib/hero"

/** The whole line, for the assertions that do not care where it splits. */
function text(...args: Parameters<typeof heroSubline>): string {
  const parts = heroSubline(...args)
  return `${parts.before}${parts.handle ? `@${parts.handle}` : ""}${parts.after}`
}

describe("heroSubline", () => {
  it("names what the number measures, since nothing above it does", () => {
    // The eyebrow that used to say "fastest install" is gone, so this line
    // carries the only mention of what the board is about.
    expect(text("ada", 1)).toContain("Omarchy")
  })

  it("credits a sole holder by handle", () => {
    expect(text("ada", 1)).toContain("@ada")
  })

  it("hands the holder's handle back on its own, so it can be linked", () => {
    // The leader is a real person with an X profile; a name in flat prose is
    // a dead end for anyone who wants to see who just beat them.
    const parts = heroSubline("ada", 1)
    expect(parts.handle).toBe("ada")
    expect(parts.before).toMatch(/Omarchy install\.\s$/)
    expect(parts.after).toMatch(/^ holds it/)
  })

  it("has no handle to link when nobody holds it alone", () => {
    expect(heroSubline("ada", 3).handle).toBeNull()
    expect(heroSubline(null, 0).handle).toBeNull()
  })

  it("counts the holders when a tie shares the top", () => {
    const line = text("ada", 3)
    expect(line).toContain("3 share it")
    // Naming one of three would read as though the others did not count.
    expect(line).not.toContain("@ada")
  })

  it("invites the first entry when the board is empty", () => {
    const line = text(null, 0)
    expect(line).toContain("Rank yours")
    expect(line).not.toContain("@")
  })

  it("always closes with something to do", () => {
    for (const line of [text("ada", 1), text("ada", 2), text(null, 0)]) {
      expect(line.toLowerCase()).toContain("rank yours")
    }
  })
})
