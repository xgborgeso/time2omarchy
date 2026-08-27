import { describe, expect, it } from "vitest"
import { isStoredBootScreen, localUploadName } from "@/lib/storage-key"

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
