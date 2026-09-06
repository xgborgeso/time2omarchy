import { describe, expect, it, vi } from "vitest"

// `next/font/google` is rewritten by Next's build plugin, so imported outside
// it the loader is a plain object rather than the function the layout calls.
// The font has nothing to do with what this file is about.
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans", className: "font-sans" }),
}))

const { metadata, viewport } = await import("../app/layout")

/**
 * What a crawler is told.
 *
 * Nothing on the page shows any of this, so it has no user to notice when it
 * breaks — a share card renders wrong somewhere else, days later, and the
 * first report of it is a screenshot from someone who does not know what an
 * og tag is.
 */
describe("share metadata", () => {
  it("gives every url an origin to resolve against", () => {
    // Without metadataBase, Next resolves "/og.png" against localhost and
    // ships a card image nobody outside the machine can fetch.
    expect(new URL(metadata.metadataBase as URL).origin).toBe("https://time2omarchy.com")
  })

  it("asks for the large card, which is the one with a picture in it", () => {
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" })
  })

  it("declares the image size on both cards", () => {
    // A client with the dimensions can commit to the large-card layout before
    // it has the bytes; one without them falls back to the small side-by-side
    // card while the image loads, which reads as a missing image.
    for (const images of [metadata.openGraph?.images, metadata.twitter?.images]) {
      const [image] = images as { width: number; height: number; alt: string }[]
      expect(image).toMatchObject({ width: 1200, height: 630 })
      expect(image.alt).toBeTruthy()
    }
  })

  it("points both cards at the same image", () => {
    const og = metadata.openGraph?.images as { url: string }[] | undefined
    const twitter = metadata.twitter?.images as { url: string }[] | undefined
    expect(og?.[0]?.url).toBe(twitter?.[0]?.url)
  })

  it("says who it is and what it is, on every surface", () => {
    expect(metadata.title).toBeTruthy()
    expect(metadata.description).toBeTruthy()
    expect(metadata.openGraph?.title).toBe(metadata.title)
    expect(metadata.twitter?.title).toBe(metadata.title)
  })

  it("names itself a community project where it will actually be read", () => {
    // Not affiliated with Omarchy or DHH. The footer says so on the page; the
    // description is what says so in a search result.
    expect(metadata.description).toMatch(/not affiliated/i)
  })

  it("canonicalises to the root, so a paginated url is not a second site", () => {
    expect(metadata.alternates?.canonical).toBe("/")
  })

  it("carries a theme colour matching the page it themes", () => {
    expect(viewport.themeColor).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
