import { describe, expect, it } from "vitest"
import { decideEntry } from "../src/lib/ranking"

const unverified = (timeSeconds: number) => ({ timeSeconds, verified: false })
const verified = (timeSeconds: number) => ({ timeSeconds, verified: true })

describe("decideEntry", () => {
  it("creates a row when the handle is free", () => {
    expect(decideEntry(null, unverified(43))).toBe("create")
    expect(decideEntry(null, verified(43))).toBe("create")
  })

  describe("an unverified entry may create but never replace", () => {
    it("cannot overwrite another unverified entry, even with a faster time", () => {
      expect(decideEntry(unverified(90), unverified(43))).toBe("reject")
    })

    it("cannot overwrite a verified entry", () => {
      expect(decideEntry(verified(90), unverified(43))).toBe("reject")
    })

    it("cannot overwrite its own earlier entry either", () => {
      // Improving a time requires verifying — otherwise the "owner" of an
      // unverified row is just whoever typed the handle first.
      expect(decideEntry(unverified(60), unverified(50))).toBe("reject")
    })
  })

  describe("a verified entry claims an unverified row", () => {
    it("takes over regardless of time, since the old time was never trusted", () => {
      expect(decideEntry(unverified(43), verified(200))).toBe("claim")
      expect(decideEntry(unverified(200), verified(43))).toBe("claim")
    })
  })

  describe("between verified entries the fastest time wins", () => {
    it("replaces on a faster time", () => {
      expect(decideEntry(verified(90), verified(43))).toBe("replace")
    })

    it("replaces on an equal time so the proof can be refreshed", () => {
      expect(decideEntry(verified(43), verified(43))).toBe("replace")
    })

    it("keeps the existing row when the new time is slower", () => {
      expect(decideEntry(verified(43), verified(90))).toBe("keep")
    })
  })
})
