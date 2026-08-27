import { describe, expect, it } from "vitest"
import { SHARE_HASHTAGS, shareIntentUrl, shareText } from "../src/lib/share"

describe("shareText", () => {
  it("calls out taking the top spot", () => {
    const text = shareText({ rank: 1, timeSeconds: 43, total: 1204 })
    expect(text).toContain("#1")
    expect(text).toContain("43s")
    expect(text).toMatch(/took/i)
  })

  it("reports rank against the field for everyone else", () => {
    const text = shareText({ rank: 7, timeSeconds: 135, total: 1204 })
    expect(text).toContain("#7")
    expect(text).toContain("1,204")
    expect(text).toContain("2:15")
  })

  it("names Omarchy so the tweet stands alone", () => {
    expect(shareText({ rank: 4, timeSeconds: 64, total: 90 })).toMatch(/omarchy/i)
  })

  it("uses the top-spot copy when you are the only entry", () => {
    expect(shareText({ rank: 1, timeSeconds: 43, total: 1 })).toMatch(/took/i)
  })

  it("leaves room for the url and hashtags X appends", () => {
    const longest = shareText({ rank: 999999, timeSeconds: 899, total: 9999999 })
    expect(longest.length).toBeLessThanOrEqual(200)
  })
})

describe("shareIntentUrl", () => {
  const url = () => new URL(shareIntentUrl({ rank: 7, timeSeconds: 135, total: 1204 }))

  it("points at X's post composer", () => {
    expect(url().origin + url().pathname).toBe("https://x.com/intent/post")
  })

  it("carries the message as a query parameter", () => {
    expect(url().searchParams.get("text")).toBe(
      shareText({ rank: 7, timeSeconds: 135, total: 1204 }),
    )
  })

  it("attaches both hashtags without the # prefix X adds itself", () => {
    const hashtags = url().searchParams.get("hashtags")
    expect(hashtags).toBe(SHARE_HASHTAGS.join(","))
    expect(hashtags).not.toContain("#")
  })

  it("links back to the board", () => {
    expect(url().searchParams.get("url")).toMatch(/^https:\/\//)
  })

  it("encodes characters that would otherwise break the query string", () => {
    const raw = shareIntentUrl({ rank: 7, timeSeconds: 135, total: 1204 })
    // The em dash and # in the copy must not appear unencoded in the query.
    expect(raw.split("?")[1]).not.toContain("#")
    expect(raw.split("?")[1]).not.toContain("—")
  })
})
