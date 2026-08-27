import { describe, expect, it } from "vitest"
import { MAX_BOOT_SCREEN_BYTES, validateBootScreen } from "../src/lib/validation"

describe("validateBootScreen", () => {
  it("requires a file", () => {
    expect(validateBootScreen(null)?.error).toMatch(/boot screen/i)
  })

  it("rejects non-images", () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" })
    expect(validateBootScreen(file)?.error).toMatch(/png/i)
  })

  it("rejects oversized files", () => {
    const file = new File([new Uint8Array(MAX_BOOT_SCREEN_BYTES + 1)], "boot.png", {
      type: "image/png",
    })
    expect(validateBootScreen(file)?.error).toMatch(/4 MB/i)
  })

  it("accepts a small png", () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "boot.png", {
      type: "image/png",
    })
    expect(validateBootScreen(file)).toBeNull()
  })

  it("names the boot screen field, not the old screenshot one", () => {
    expect(validateBootScreen(null)?.field).toBe("bootScreen")
  })
})
