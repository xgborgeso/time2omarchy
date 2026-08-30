import { describe, expect, it } from "vitest"
import { heroSubline } from "@/lib/hero"

describe("heroSubline", () => {
  it("names what the number measures, since nothing above it does", () => {
    // The eyebrow that used to say "fastest install" is gone, so this line
    // carries the only mention of what the board is about.
    expect(heroSubline()).toContain("Omarchy")
  })

  it("says what the board measures and stops", () => {
    // It used to close with "Rank yours". The steps beneath it now say what
    // ranking costs and the button says it in a place you can press, so the
    // sentence was asking for something twice before the page had explained
    // it once.
    const said = heroSubline().toLowerCase()
    expect(said).toContain("omarchy")
    expect(said).not.toContain("rank yours")
  })

  it("says the same thing however the board stands", () => {
    // It used to credit a sole leader and count them on a tie. Ties are the
    // normal case at second granularity, and "3 share it" read as a hedge.
    // The leader's handle is an X link on the first entry either way.
    expect(heroSubline()).not.toContain("@")
    expect(heroSubline()).not.toMatch(/share it|holds it/)
  })
})
