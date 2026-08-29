import { describe, expect, it } from "vitest"
import { isStoredBootScreen, localUploadName, uploadName } from "@/lib/storage-key"

describe("localUploadName", () => {
  it("takes the bare filename from an uploads path", () => {
    expect(localUploadName("/uploads/ada-123.png")).toBe("ada-123.png")
  })

  it("refuses a path that is not an upload", () => {
    expect(localUploadName("/etc/passwd")).toBeNull()
    expect(localUploadName("https://cdn.example.com/ada.png")).toBeNull()
  })

  it("refuses a traversal attempt", () => {
    expect(localUploadName("/uploads/../../etc/passwd")).toBeNull()
    expect(localUploadName("/uploads/sub/ada.png")).toBeNull()
  })
})

describe("isStoredBootScreen", () => {
  it("accepts a url this app issued", () => {
    expect(isStoredBootScreen("/uploads/ada-1.png")).toBe(true)
  })

  it("rejects a url pointing anywhere else", () => {
    // Ranking takes a url, so without this anyone could put an arbitrary
    // remote image on the board and have every visitor load it.
    expect(isStoredBootScreen("https://evil.example/pwn.png")).toBe(false)
    expect(isStoredBootScreen("https://evil.example/uploads/pwn.png")).toBe(false)
    expect(isStoredBootScreen("javascript:alert(1)")).toBe(false)
    expect(isStoredBootScreen("//evil.example/pwn.png")).toBe(false)
    expect(isStoredBootScreen("")).toBe(false)
  })

  it("rejects traversal", () => {
    expect(isStoredBootScreen("/uploads/../../etc/passwd")).toBe(false)
  })
})

describe("with a remote upload host", () => {
  const base = "https://cdn.time2omarchy.com"

  it("accepts a url under the host it was told about", () => {
    expect(isStoredBootScreen(`${base}/uploads/ada-1.png`, base)).toBe(true)
    expect(uploadName(`${base}/uploads/ada-1.png`, base)).toBe("ada-1.png")
  })

  it("refuses a url on any other host", () => {
    // The gate that stops the board pointing every visitor at a remote image
    // of someone else's choosing.
    expect(isStoredBootScreen("https://evil.example/uploads/x.png", base)).toBe(false)
    expect(
      isStoredBootScreen("https://cdn.time2omarchy.com.evil.example/uploads/x.png", base),
    ).toBe(false)
  })

  it("refuses any path that is not one of the two shapes we serve", () => {
    // Traversal normalises away before this sees it — `/uploads/../secret.png`
    // arrives as `/secret.png` — so the check is the shape, not the dots.
    expect(isStoredBootScreen(`${base}/uploads/../secret.png`, base)).toBe(false)
    expect(isStoredBootScreen(`${base}/uploads/a/b.png`, base)).toBe(false)
    expect(isStoredBootScreen(`${base}/secret.png`, base)).toBe(false)
  })

  it("accepts the shape UploadThing serves", () => {
    expect(isStoredBootScreen(`${base}/f/abc123.webp`, base)).toBe(true)
  })

  it("keeps accepting local urls when no host is configured", () => {
    expect(isStoredBootScreen("/uploads/ada-1.png", null)).toBe(true)
    expect(isStoredBootScreen("https://anywhere/uploads/ada-1.png", null)).toBe(false)
  })
})
