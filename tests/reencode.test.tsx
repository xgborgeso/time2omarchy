import { afterEach, describe, expect, it, vi } from "vitest"
import { reencodeBootScreen } from "@/lib/reencode"

/**
 * Redrawing a boot screen before it leaves the browser.
 *
 * There is no server in the middle of an upload, so this is the only place
 * EXIF is stripped and the only proof the file is an image at all. happy-dom
 * ships no canvas and no `createImageBitmap`, so both are stubbed — what is
 * under test is the decision each outcome leads to, not the browser's codec.
 */
type Stub = {
  width?: number
  height?: number
  decodes?: boolean
  context?: boolean
  blob?: boolean
}

const closed = vi.fn()

function stubBrowser({
  width = 3840,
  height = 2160,
  decodes = true,
  context = true,
  blob = true,
}: Stub = {}) {
  vi.stubGlobal("createImageBitmap", async () => {
    if (!decodes) throw new Error("not an image")
    return { width, height, close: closed }
  })

  const drawn: { width: number; height: number }[] = []
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag !== "canvas")
      return document.createElementNS("http://www.w3.org/1999/xhtml", tag)
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => (context ? { drawImage: () => {} } : null),
      toBlob: (cb: (b: Blob | null) => void) => {
        drawn.push({ width: canvas.width, height: canvas.height })
        cb(blob ? new Blob(["x"], { type: "image/webp" }) : null)
      },
    }
    return canvas as unknown as HTMLElement
  })
  return drawn
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  closed.mockClear()
})

const file = () => new File(["x"], "boot.png", { type: "image/png" })

describe("reencodeBootScreen", () => {
  it("refuses anything the browser cannot decode", async () => {
    // A stronger check than the declared MIME type, which is set by whoever
    // sends the file.
    stubBrowser({ decodes: false })
    expect(await reencodeBootScreen(file())).toEqual({
      ok: false,
      error: "That file is not an image we can read.",
    })
  })

  it("returns a full image and a thumbnail, both WebP", async () => {
    stubBrowser()
    const result = await reencodeBootScreen(file())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.files.full.type).toBe("image/webp")
    expect(result.files.thumb.type).toBe("image/webp")
    expect(result.files.full.name).toMatch(/\.webp$/)
  })

  it("shrinks a 4K screenshot to the long edge, keeping its shape", async () => {
    const drawn = stubBrowser({ width: 3840, height: 2160 })
    await reencodeBootScreen(file())

    const full = drawn.find((d) => d.width === 2000)
    expect(full).toEqual({ width: 2000, height: 1125 })
  })

  it("leaves an already-small image alone rather than upscaling it", async () => {
    const drawn = stubBrowser({ width: 800, height: 600 })
    await reencodeBootScreen(file())
    expect(drawn).toContainEqual({ width: 800, height: 600 })
  })

  it("draws a thumbnail far smaller than the full copy", async () => {
    // The board shows fifty at once; shipping fifty full images is the whole
    // reason the second file exists.
    const drawn = stubBrowser({ width: 3840, height: 2160 })
    await reencodeBootScreen(file())

    const widths = drawn.map((d) => d.width).sort((a, b) => a - b)
    expect(widths[0]).toBeLessThan(widths[1]!)
  })

  it("handles a portrait screenshot by its own long edge", async () => {
    const drawn = stubBrowser({ width: 1080, height: 2400 })
    await reencodeBootScreen(file())
    expect(drawn).toContainEqual({ width: 900, height: 2000 })
  })

  it("says so when the canvas gives back nothing", async () => {
    stubBrowser({ blob: false })
    expect(await reencodeBootScreen(file())).toEqual({
      ok: false,
      error: "Could not process that image.",
    })
  })

  it("says so when there is no drawing context at all", async () => {
    stubBrowser({ context: false })
    expect(await reencodeBootScreen(file())).toMatchObject({ ok: false })
  })

  it("frees the decoded pixels whichever way it went", async () => {
    // A 4K bitmap is 33MB held until the next collection otherwise, and the
    // form can be used repeatedly without a reload.
    stubBrowser()
    await reencodeBootScreen(file())
    expect(closed).toHaveBeenCalled()

    closed.mockClear()
    stubBrowser({ blob: false })
    await reencodeBootScreen(file())
    expect(closed).toHaveBeenCalled()
  })
})
