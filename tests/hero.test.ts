import { describe, expect, it } from "vitest"
import { heroSubline } from "@/lib/hero"

describe("heroSubline", () => {
  it("names what the number measures, since nothing above it does", () => {
    // The eyebrow that used to say "fastest install" is gone, so this line
    // carries the only mention of what the board is about.
    expect(heroSubline("ada", 1)).toContain("Omarchy")
  })

  it("credits a sole holder by handle", () => {
    expect(heroSubline("ada", 1)).toContain("@ada")
  })

  it("counts the holders when a tie shares the top", () => {
    const line = heroSubline("ada", 3)
    expect(line).toContain("3 share it")
    // Naming one of three would read as though the others did not count.
    expect(line).not.toContain("@ada")
  })

  it("invites the first entry when the board is empty", () => {
    const line = heroSubline(null, 0)
    expect(line).toContain("Rank yours")
    expect(line).not.toContain("@")
  })

  it("always closes with something to do", () => {
    for (const line of [
      heroSubline("ada", 1),
      heroSubline("ada", 2),
      heroSubline(null, 0),
    ]) {
      expect(line.toLowerCase()).toContain("rank yours")
    }
  })
})
