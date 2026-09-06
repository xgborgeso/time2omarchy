import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * What the form refuses before it spends anything.
 *
 * Every check here happens ahead of the upload on purpose: a missing field
 * should not cost a round trip, four megabytes of transfer and a file left
 * orphaned in storage. The server checks the same things again — the form is
 * not the only caller — but reaching it is the expensive path.
 */
const rankMutate = vi.fn(async (_input: Record<string, unknown>) => ({
  ok: true as const,
  created: true,
  improved: true,
  keptBest: false,
  bestTimeSeconds: 43,
  entry: {},
  board: {},
}))
const startUpload = vi.fn(async () => [
  { serverData: { url: "https://x/f/a", key: "a", thumb: false } },
  { serverData: { url: "https://x/f/b", key: "b", thumb: true } },
])
const reencode = vi.fn(async () => ({
  ok: true as const,
  files: { full: new File([""], "f.webp"), thumb: new File([""], "t.webp") },
}))

vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    rank: { mutationOptions: () => ({ mutationFn: rankMutate }) },
    // The form renders SpecsFields, which searches the catalogue. Answering
    // with nothing keeps this file about the form rather than the picker,
    // which has a suite of its own.
    cpus: {
      queryOptions: (input: { query: string }) => ({
        queryKey: ["cpus", input.query],
        queryFn: async () => [],
      }),
    },
  }),
}))
let uploadOptions: { onUploadError?: (err: unknown) => void } = {}
vi.mock("@/lib/uploadthing", () => ({
  useUploadThing: (_slug: string, options: { onUploadError?: (err: unknown) => void }) => {
    uploadOptions = options
    return { startUpload }
  },
}))
vi.mock("@/lib/reencode", () => ({ reencodeBootScreen: reencode }))
// The picker has its own suite. Here it only needs to be able to hand the
// form a complete, valid machine, so the path past the guards can be reached.
vi.mock("@/components/SpecsFields", async () => {
  const actual = await vi.importActual<typeof import("@/components/SpecsFields")>(
    "@/components/SpecsFields",
  )
  return {
    ...actual,
    SpecsFields: ({
      value,
      onChange,
    }: {
      value: unknown
      onChange: (next: unknown) => void
    }) => (
      <>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...(value as object),
              cpuId: "amd-ryzen-7-9800x3d",
              cpuOther: null,
              ramGb: 32,
              storage: "nvme",
            })
          }
        >
          pick a machine
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...(value as object),
              cpuId: "other",
              cpuOther: null,
              ramGb: 32,
              storage: "nvme",
            })
          }
        >
          pick other, unnamed
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...(value as object),
              cpuId: "other",
              cpuOther: "Intel(R) N100",
              ramGb: 32,
              storage: "nvme",
            })
          }
        >
          pick other, named
        </button>
      </>
    ),
  }
})

const { RankForm } = await import("@/components/RankForm")

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** A boot screen, as a file input would hand one over. */
function bootScreen() {
  return new File(["x"], "boot.png", { type: "image/png" })
}

beforeEach(() => {
  rankMutate.mockClear()
  startUpload.mockClear()
  reencode.mockClear()
})

async function fillTime(user: ReturnType<typeof userEvent.setup>, value = "43s") {
  await user.type(screen.getByLabelText(/time/i), value)
}

/** The input is `sr-only` and driven by the drop zone, so it has no label. */
function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

describe("what the form refuses before uploading", () => {
  it("asks for a time first", async () => {
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(startUpload).not.toHaveBeenCalled()
  })

  it("asks for a boot screen once there is a time", async () => {
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await fillTime(user)
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    expect(await screen.findByText(/add a boot screen/i)).toBeVisible()
    expect(startUpload).not.toHaveBeenCalled()
  })

  it("asks for the machine once there is a screen", async () => {
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await fillTime(user)
    await user.upload(fileInput(container), bootScreen())
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    expect(await screen.findByText(/pick your cpu, memory and drive/i)).toBeVisible()
    expect(startUpload).not.toHaveBeenCalled()
  })

  it("refuses a time that could not have been an install", async () => {
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await fillTime(user, "1s")
    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(startUpload).not.toHaveBeenCalled()
  })
})

describe("taking the boot screen", () => {
  it("shows what was chosen, so the picker is not a black hole", async () => {
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    await userEvent.setup().upload(fileInput(container), bootScreen())

    expect(await screen.findByRole("img")).toBeVisible()
  })

  it("takes one dropped on the zone", async () => {
    // The drop target is the whole button, and dropping is how most people
    // with a screenshot on the desktop will do this.
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const zone = screen.getByRole("button", { name: /^add$/i })

    const file = bootScreen()
    const dataTransfer = {
      files: [file],
      items: [{ kind: "file", type: file.type, getAsFile: () => file }],
      types: ["Files"],
    }
    await userEvent.setup().pointer({ target: zone })
    zone.dispatchEvent(
      Object.assign(new Event("drop", { bubbles: true }), { dataTransfer }),
    )

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull())
  })

  it("highlights while something is over it, and stops when it leaves", async () => {
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    const zone = screen.getByRole("button", { name: /^add$/i })
    const quiet = zone.className

    fireEvent.dragOver(zone)
    expect(zone.className).not.toBe(quiet)

    fireEvent.dragLeave(zone)
    expect(zone.className).toBe(quiet)
  })
})

/** Everything the form needs before it will spend a byte. */
async function fillEverything(container: HTMLElement) {
  const user = userEvent.setup()
  await fillTime(user)
  await user.upload(fileInput(container), bootScreen())
  await user.click(screen.getByRole("button", { name: /pick a machine/i }))
  return user
}

describe("submitting", () => {
  it("redraws the image before it leaves the browser", async () => {
    // Strips the EXIF a phone photo carries, proves the file decodes, and
    // turns four megabytes into a few hundred kilobytes. Nothing downstream
    // can do any of it — the bytes never pass through this app.
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    await waitFor(() => expect(reencode).toHaveBeenCalled())
  })

  it("uploads the pair in one trip, then ranks", async () => {
    const onSuccess = vi.fn()
    const { container } = render(<RankForm onSuccess={onSuccess} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    await waitFor(() => expect(startUpload).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(rankMutate).toHaveBeenCalled())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())

    const sent = rankMutate.mock.calls[0]?.[0]
    expect(sent).toMatchObject({
      cpuId: "amd-ryzen-7-9800x3d",
      ramGb: 32,
      storage: "nvme",
      bootScreenKey: "a",
      bootScreenThumbKey: "b",
    })
  })

  it("stops at the re-encode when the file will not decode", async () => {
    reencode.mockResolvedValueOnce({
      ok: false,
      error: "Not an image we can read.",
    } as never)
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(await screen.findByText(/not an image we can read/i)).toBeVisible()
    expect(startUpload).not.toHaveBeenCalled()
  })

  it("says so when the upload comes back incomplete", async () => {
    // UploadThing does not report a half-finished pair as an error, so the
    // missing half has to be noticed here.
    startUpload.mockResolvedValueOnce([
      { serverData: { url: "https://x/f/a", key: "a", thumb: false } },
    ] as never)
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(rankMutate).not.toHaveBeenCalled()
  })

  it("shows what the server refused, against the field it was about", async () => {
    rankMutate.mockResolvedValueOnce({
      ok: false,
      error: "@ada is already held by another entry.",
      field: "handle",
    } as never)
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(await screen.findByText(/already held by another entry/i)).toBeVisible()
  })

  it("goes quiet while it is working, so nothing is sent twice", async () => {
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    const submit = screen.getByRole("button", { name: /rank it/i })
    await user.click(submit)
    await waitFor(() => expect(rankMutate).toHaveBeenCalledTimes(1))
  })
})

describe("pasting a screenshot", () => {
  it("takes an image straight off the clipboard", async () => {
    // The shortest path from a screenshot to a rank: most people take one and
    // paste it, and making them save it to disk first is a step for nothing.
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })

    const file = bootScreen()
    window.dispatchEvent(
      Object.assign(new Event("paste"), {
        clipboardData: {
          items: [{ type: "image/png", getAsFile: () => file }],
        },
      }),
    )

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull())
  })

  it("ignores a paste that carries no image", async () => {
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })

    window.dispatchEvent(
      Object.assign(new Event("paste"), {
        clipboardData: { items: [{ type: "text/plain", getAsFile: () => null }] },
      }),
    )

    expect(container.querySelector("img")).toBeNull()
  })

  it("stops listening once the form is gone", async () => {
    // The listener is on window, so an unmounted form left holding one would
    // keep setting state on a component nobody is looking at.
    const { unmount, container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    unmount()

    expect(() =>
      window.dispatchEvent(
        Object.assign(new Event("paste"), {
          clipboardData: { items: [{ type: "image/png", getAsFile: () => bootScreen() }] },
        }),
      ),
    ).not.toThrow()
    expect(container.querySelector("img")).toBeNull()
  })
})

describe("the escape hatch, client side", () => {
  it("will not submit Other with no chip named", async () => {
    // The server refuses it too, but reaching the server costs an upload.
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await fillTime(user)
    await user.upload(fileInput(container), bootScreen())
    await user.click(screen.getByRole("button", { name: /pick other, unnamed/i }))
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    expect(
      await screen.findByText(/name your chip so the next person finds it/i),
    ).toBeVisible()
    expect(startUpload).not.toHaveBeenCalled()
  })
})

describe("when the request never lands", () => {
  it("says so rather than leaving the button spinning", async () => {
    // Only transport failures reach here; every domain outcome comes back as
    // data with a field attached.
    rankMutate.mockRejectedValueOnce(new Error("offline"))
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(await screen.findByRole("alert")).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /rank it/i })).toBeEnabled(),
    )
  })

  it("names the cause when the upload itself reported one", async () => {
    startUpload.mockResolvedValueOnce(undefined as never)
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(await screen.findByRole("alert")).toBeVisible()
  })
})

describe("when UploadThing reports the cause itself", () => {
  it("keeps the reason it was handed, since startUpload will not repeat it", async () => {
    // `startUpload` hands the error to `onUploadError` and then resolves
    // undefined, so by the time the caller sees a missing result the cause is
    // already gone unless it was kept here.
    // Reported during the upload, which is when it really happens: onSubmit
    // clears the ref on its way in, so anything set beforehand is gone.
    startUpload.mockImplementationOnce(async () => {
      uploadOptions.onUploadError?.({ code: "TOO_LARGE" })
      return undefined as never
    })
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await fillEverything(container)

    await user.click(screen.getByRole("button", { name: /rank it/i }))

    expect(await screen.findByText(/too large/i)).toBeVisible()
  })
})

describe("the drop zone as a button", () => {
  it("opens the file picker when it is clicked rather than dropped on", async () => {
    // Most people click; the drop target is the same element so that both
    // habits land in the same place.
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const input = fileInput(container)
    const clicked = vi.spyOn(input, "click").mockImplementation(() => {})

    await userEvent.setup().click(screen.getByRole("button", { name: /^add$/i }))
    expect(clicked).toHaveBeenCalled()
  })
})

describe("the last few ways the form is used", () => {
  it("submits Other once it does say what it is", async () => {
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await fillTime(user)
    await user.upload(fileInput(container), bootScreen())
    await user.click(screen.getByRole("button", { name: /pick other, named/i }))
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    await waitFor(() => expect(rankMutate).toHaveBeenCalled())
    expect(rankMutate.mock.calls[0]?.[0]).toMatchObject({
      cpuId: "other",
      cpuOther: "Intel(R) N100",
    })
  })

  it("ignores a file dialog that was closed without choosing", async () => {
    // `files` is empty rather than absent, and treating that as a selection
    // would clear a screenshot somebody already picked.
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await user.upload(fileInput(container), bootScreen())
    expect(container.querySelector("img")).not.toBeNull()

    fireEvent.change(fileInput(container), { target: { files: [] } })
    expect(container.querySelector("img")).toBeNull()
  })

  it("ignores a paste carrying no clipboard at all", async () => {
    const { container } = render(<RankForm onSuccess={() => {}} />, { wrapper })
    window.dispatchEvent(new Event("paste"))
    expect(container.querySelector("img")).toBeNull()
  })

  it("says nothing where there is no complaint to make", async () => {
    // The message element is rendered unconditionally beside its field, so it
    // has to draw nothing rather than an empty red line.
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
