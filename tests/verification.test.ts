import { describe, expect, it } from "vitest"
import { claimText, parseOembed, postIdFrom, postProvesClaim } from "@/lib/verification"

/** Real payload shape, captured from publish.twitter.com/oembed. */
const obama = {
  url: "https://x.com/BarackObama/status/896523232098078720",
  author_name: "Barack Obama",
  author_url: "https://x.com/BarackObama",
  html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Verifying for time2omarchy: t2o-abc123</p>&mdash; Barack Obama (@BarackObama) <a href="https://x.com/BarackObama/status/896523232098078720">August 12, 2017</a></blockquote>',
}

describe("parseOembed", () => {
  it("takes the handle from author_url, never author_name", () => {
    // author_name is the display name and is freely settable, so trusting it
    // would let anyone claim any handle by renaming themselves.
    const post = parseOembed(obama)
    expect(post?.handle).toBe("barackobama")
    expect(post?.handle).not.toBe("barack obama")
  })

  it("extracts the post text the nonce sits in", () => {
    expect(parseOembed(obama)?.text).toContain("t2o-abc123")
  })

  it("returns null for anything that is not a usable payload", () => {
    expect(parseOembed(null)).toBeNull()
    expect(parseOembed("<html>404</html>")).toBeNull()
    expect(parseOembed({ author_name: "jack" })).toBeNull()
    expect(parseOembed({ author_url: "https://x.com/jack" })).toBeNull()
  })
})

describe("postProvesClaim", () => {
  const post = { handle: "ada", text: "Verifying for time2omarchy: t2o-abc123" }

  it("accepts the claimed handle carrying its own nonce", () => {
    expect(postProvesClaim(post, "ada", "t2o-abc123")).toBe(true)
  })

  it("ignores handle casing, since X preserves display casing", () => {
    expect(postProvesClaim({ ...post, handle: "AdA" }, "ada", "t2o-abc123")).toBe(true)
  })

  it("rejects a replayed post from a different author", () => {
    // Anyone can read a public nonce. Verifying must still fail unless the
    // post's author is the handle the nonce was issued to.
    expect(postProvesClaim({ ...post, handle: "mallory" }, "ada", "t2o-abc123")).toBe(false)
  })

  it("rejects a post that does not carry the nonce", () => {
    expect(
      postProvesClaim(
        { handle: "ada", text: "just installed omarchy" },
        "ada",
        "t2o-abc123",
      ),
    ).toBe(false)
  })

  it("rejects a near-miss nonce rather than substring-matching loosely", () => {
    expect(postProvesClaim(post, "ada", "t2o-abc1234")).toBe(false)
  })
})

describe("claimText", () => {
  it("embeds the nonce so the posted text can be checked", () => {
    expect(claimText("t2o-abc123")).toContain("t2o-abc123")
  })
})

describe("postIdFrom", () => {
  it("reads the id from both x.com and twitter.com urls", () => {
    expect(postIdFrom("https://x.com/ada/status/20")).toBe("20")
    expect(postIdFrom("https://twitter.com/ada/status/20")).toBe("20")
    expect(postIdFrom("https://x.com/ada/status/20?s=46&t=xyz")).toBe("20")
  })

  it("rejects anything that is not an x post url", () => {
    expect(postIdFrom("https://evil.example/x.com/ada/status/20")).toBeNull()
    expect(postIdFrom("https://x.com/ada")).toBeNull()
    expect(postIdFrom("not a url")).toBeNull()
  })
})
