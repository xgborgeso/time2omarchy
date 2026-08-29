import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RankForm } from "@/components/RankForm"

const rankFn = vi.fn()
const uploadFn = vi.fn()
const reencodeFn = vi.fn()
const toastError = vi.fn()

vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    rank: { mutationOptions: () => ({ mutationFn: rankFn }) },
  }),
}))

vi.mock("@/lib/uploadthing", () => ({
  useUploadThing: () => ({ startUpload: (...args: unknown[]) => uploadFn(...args) }),
}))

vi.mock("@/lib/reencode", () => ({
  reencodeBootScreen: (...args: unknown[]) => reencodeFn(...args),
}))

// Stubbed so these tests stay about upload and ranking rather than about
// driving a combobox. The picker is covered separately.
vi.mock("@/components/SpecsFields", () => ({
  FIELD_ROW: "",
  SpecsFields: ({ onChange }: { onChange: (s: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onChange({ cpuId: "apple-m4-max", ramGb: 32, storage: "nvme" })}
    >
      fill specs
    </button>
  ),
}))

function wrapper({ children }: { children: ReactNode }) {
  // retry off: a failing mutation should surface immediately, not after backoff.
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function bootScreen(): File {
  return new File(["x"], "boot.png", { type: "image/png" })
}

/**
 * Fills the form and submits, as a person would.
 *
 * No handle: the form does not ask for one. Reaching this component at all
 * means X already answered, and the entry is named by that answer.
 */
async function submit(time: string, withSpecs = true) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^time$/i), time)
  await user.upload(
    document.querySelector("input[type=file]") as HTMLInputElement,
    bootScreen(),
  )
  if (withSpecs) {
    await user.click(screen.getByRole("button", { name: /fill specs/i }))
  }
  await user.click(screen.getByRole("button", { name: /rank it/i }))
  return user
}

beforeEach(() => {
  toastError.mockReset()
  rankFn.mockReset()
  uploadFn.mockReset()
  uploadFn.mockResolvedValue([
    { serverData: { url: "https://app.ufs.sh/f/x-1.webp", key: "x-1.webp" } },
  ])
  reencodeFn.mockReset()
  reencodeFn.mockImplementation(async (file: File) => ({ ok: true, file }))
})

describe("RankForm", () => {
  it("refuses to submit without specs, since every entry needs a machine", async () => {
    // Reported install times span 45s to eight minutes on identical software,
    // so a time with no machine attached compares to nothing.
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43", false)

    expect(await screen.findByRole("alert")).toHaveTextContent(/CPU, memory and drive/i)
    expect(uploadFn).not.toHaveBeenCalled()
    expect(rankFn).not.toHaveBeenCalled()
  })

  it("sends the specs along with the rank", async () => {
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: {},
      board: { entries: [] },
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43")

    await waitFor(() => expect(rankFn).toHaveBeenCalled())
    expect(rankFn.mock.calls[0]?.[0]).toMatchObject({
      cpuId: "apple-m4-max",
      ramGb: 32,
      storage: "nvme",
    })
  })

  it("uploads first, then ranks with the returned url", async () => {
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: {},
      board: { entries: [] },
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43")

    await waitFor(() => expect(rankFn).toHaveBeenCalled())
    // No handle in either call: the upload endpoint and the rank mutation
    // both take the name from the session rather than from this form.
    expect(uploadFn).toHaveBeenCalledWith([expect.any(File)])
    expect(rankFn.mock.calls[0]?.[0]).toMatchObject({
      time: "43",
      bootScreenUrl: "https://app.ufs.sh/f/x-1.webp",
      // Stored beside the url, because UploadThing cannot derive one from it.
      bootScreenKey: "x-1.webp",
    })
    expect(rankFn.mock.calls[0]?.[0]).not.toHaveProperty("handle")
  })

  it("does not rank at all when the upload fails", async () => {
    uploadFn.mockResolvedValue(undefined)
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43")

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not upload/i)
    expect(rankFn).not.toHaveBeenCalled()
  })

  it("never uploads a file it could not redraw", async () => {
    // The redraw is what strips EXIF. Uploading the original because the
    // canvas failed would publish the GPS coordinates it exists to remove.
    reencodeFn.mockResolvedValue({ ok: false, error: "That file is not an image." })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43")

    expect(await screen.findByRole("alert")).toHaveTextContent(/not an image/i)
    expect(uploadFn).not.toHaveBeenCalled()
    expect(rankFn).not.toHaveBeenCalled()
  })

  it("never asks anyone to post a code to prove a handle", async () => {
    // Proof is an X sign-in now. Nothing should send someone off to compose a
    // post, paste a link back, or race a 15-minute nonce.
    render(<RankForm onSuccess={() => {}} />, { wrapper })

    expect(screen.queryByText(/post this from that account/i)).toBeNull()
    expect(screen.queryByLabelText(/link to your post/i)).toBeNull()
    expect(screen.queryByRole("link", { name: /post on x/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /verify @/i })).toBeNull()
  })

  it("replaces the form with the result, so it cannot be submitted twice", async () => {
    // The fields cleared themselves on success and the form stayed, which
    // showed a finished action on top of an empty invalid one: press Rank it
    // again out of reflex and "Add a time" appeared under "You're on the board".
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: { rank: 12, timeSeconds: 43 },
      board: { entries: [], counters: { entries: 121 } },
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43")

    expect(await screen.findByText("You're on the board")).toBeVisible()
    expect(screen.queryByLabelText(/^time$/i)).toBeNull()
    expect(screen.queryByRole("button", { name: /rank it/i })).toBeNull()
  })

  it("names where the entry landed, not only how fast it was", async () => {
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: { rank: 12, timeSeconds: 43 },
      board: { entries: [], counters: { entries: 1210 } },
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43")

    // Grouped, because the size of the field is the point of quoting it.
    expect(await screen.findByText("#12 of 1,210")).toBeVisible()
  })

  it("brings the form back when someone wants another go", async () => {
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: { rank: 12, timeSeconds: 43 },
      board: { entries: [], counters: { entries: 121 } },
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await submit("43")

    await user.click(await screen.findByRole("button", { name: /beat it again/i }))

    // Empty, not carrying the last attempt: this is a new run.
    expect(screen.getByLabelText(/^time$/i)).toHaveValue("")
  })

  it("closes what is holding it when there is nothing left to do", async () => {
    const onDone = vi.fn()
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: { rank: 12, timeSeconds: 43 },
      board: { entries: [], counters: { entries: 121 } },
    })
    render(<RankForm onSuccess={() => {}} onDone={onDone} />, { wrapper })
    const user = await submit("43")

    await user.click(await screen.findByRole("button", { name: /see the board/i }))
    expect(onDone).toHaveBeenCalled()
  })

  it("offers the share on the entry it just put on the board", async () => {
    // Every entry went through X, so the account that posts the brag is the
    // account the row names. There is nothing left to prove first.
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: { rank: 1, timeSeconds: 43 },
      board: { entries: [], counters: { entries: 1 } },
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("43")

    expect(await screen.findByRole("link", { name: /share/i })).toBeVisible()
  })

  it("names the missing time instead of showing the schema that caught it", async () => {
    // This rendered the raw zod issue array at the user:
    // [ { "origin": "string", "code": "too_small", "path": [ "time" ], … } ]
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.upload(
      document.querySelector("input[type=file]") as HTMLInputElement,
      bootScreen(),
    )
    await user.click(screen.getByRole("button", { name: /fill specs/i }))
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Add a time")
    expect(alert).not.toHaveTextContent(/too_small|origin|\[/)
    // A missing time should not have cost an upload.
    expect(uploadFn).not.toHaveBeenCalled()
    expect(rankFn).not.toHaveBeenCalled()
  })

  it("reads a rejected time back as a sentence", async () => {
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.type(screen.getByLabelText(/^time$/i), "soon")
    await user.upload(
      document.querySelector("input[type=file]") as HTMLInputElement,
      bootScreen(),
    )
    await user.click(screen.getByRole("button", { name: /fill specs/i }))
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/43s or 1:12/)
    expect(uploadFn).not.toHaveBeenCalled()
  })

  it("asks for everything in the order it is filled in", async () => {
    // Required fields sat below the submit button: you were invited to rank
    // before you had been asked for the machine. Time, boot screen, machine,
    // then the button that ends it.
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    const form = document.querySelector("form") as HTMLElement
    const order = Array.from(
      form.querySelectorAll("input, button, [data-slot=select-trigger], [role=combobox]"),
    )
    const at = (el: Element | null) => order.indexOf(el as Element)

    const time = at(screen.getByLabelText(/^time$/i))
    const specs = at(screen.getByRole("button", { name: /fill specs/i }))
    const rank = at(screen.getByRole("button", { name: /rank it/i }))

    expect(time).toBeLessThan(specs)
    expect(specs).toBeLessThan(rank)
  })

  it("has no sign-in, sign-out or account of any kind", async () => {
    // The only thing X is for is proving one entry. There is no logged-in
    // state to show, so the form must never imply one.
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull()
    expect(screen.queryByText(/verified as/i)).toBeNull()
  })

  it("puts an error on the field it belongs to, not just at the top", async () => {
    // Flagged by ui-ux-pro-max as high severity: a form-level alert leaves
    // someone hunting for which field it means.
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    const time = screen.getByLabelText(/^time$/i)
    expect(time).toHaveAttribute("aria-invalid", "true")
    const describedBy = time.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent("Add a time")
  })

  it("clears the field error once the form is resubmitted", async () => {
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    // Held before typing: the label grows a "→ 43s" hint once it parses.
    const time = screen.getByLabelText(/^time$/i)
    await user.click(screen.getByRole("button", { name: /rank it/i }))
    expect(time).toHaveAttribute("aria-invalid", "true")

    await user.type(time, "43")
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    // The time is valid now, so the complaint has moved on to what is missing.
    expect(time).not.toHaveAttribute("aria-invalid", "true")
  })

  it("refuses to submit without a boot screen", async () => {
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.type(screen.getByLabelText(/^time$/i), "43")
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Add a boot screen")
    expect(uploadFn).not.toHaveBeenCalled()
  })
})
