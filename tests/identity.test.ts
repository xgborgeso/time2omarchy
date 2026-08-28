import { describe, expect, it } from "vitest"
import { identityKeyFor, userFromXProfile } from "@/lib/identity"

describe("identityKeyFor", () => {
  it("keys on the numeric account id, not the handle", () => {
    // A handle can be renamed and re-registered by someone else; the id
    // cannot. Keying on the handle is what made the old oEmbed proof weak.
    expect(identityKeyFor("1665012345678901234")).toBe("x:1665012345678901234")
  })
})

describe("userFromXProfile", () => {
  const profile = {
    data: {
      id: "1665012345678901234",
      name: "Ada Lovelace",
      username: "AdaLovelace",
      profile_image_url: "https://pbs.twimg.com/profile_images/1/ada.jpg",
    },
  }

  it("takes the handle from username, cased for matching", () => {
    // The board stores handles lowercase, and @Ada and @ada are one account.
    expect(userFromXProfile(profile)?.handle).toBe("adalovelace")
  })

  it("carries the display name and avatar across", () => {
    const user = userFromXProfile(profile)
    expect(user?.name).toBe("Ada Lovelace")
    expect(user?.image).toBe("https://pbs.twimg.com/profile_images/1/ada.jpg")
  })

  it("stands in a non-routable address, since we never ask X for an email", () => {
    // `users.email` is a scope this app has no use for, and Better Auth
    // requires an address. RFC 6761 reserves .invalid so it can never resolve.
    const user = userFromXProfile(profile)
    expect(user?.email).toBe("1665012345678901234@twitter.placeholder.invalid")
    expect(user?.emailVerified).toBe(false)
  })

  it("refuses a profile with no id or username, rather than inventing one", () => {
    // A half-read profile must not become a verified identity.
    expect(userFromXProfile({ data: { id: "", name: "x", username: "y" } })).toBeNull()
    expect(userFromXProfile({} as never)).toBeNull()
  })
})
