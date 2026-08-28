import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RankForm } from "@/components/RankForm"

const rankFn = vi.fn()
const uploadFn = vi.fn()
const signInFn = vi.fn()
const signOutFn = vi.fn()

/** Reassigned per test; the hook reads it on every render. */
let session: { data: { user: { handle: string } } | null } = { data: null }

vi.mock("@/lib/auth-client", () => ({
  useSession: () => session,
  signIn: { social: (...args: unknown[]) => signInFn(...args) },
  signOut: (...args: unknown[]) => signOutFn(...args),
}))

vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    rank: { mutationOptions: () => ({ mutationFn: rankFn }) },
  }),
}))

vi.mock("@/lib/upload", () => ({
  uploadBootScreen: (...args: unknown[]) => uploadFn(...args),
}))

// Stubbed so these tests stay about upload and ranking rather than about
// driving a combobox. The picker is covered separately.
vi.mock("@/components/SpecsFields", () => ({
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

/** Fills the form and submits, as a person would. */
async function submit(handle: string, time: string, withSpecs = true) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/handle/i), handle)
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
  session = { data: null }
  signInFn.mockReset()
  signOutFn.mockReset()
  rankFn.mockReset()
  uploadFn.mockReset()
  uploadFn.mockResolvedValue({ ok: true, url: "/uploads/x-1.png" })
})

describe("RankForm", () => {
  it("refuses to submit without specs, since every entry needs a machine", async () => {
    // Reported install times span 45s to eight minutes on identical software,
    // so a time with no machine attached compares to nothing.
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("ada", "43", false)

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
    await submit("ada", "43")

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
    await submit("ada", "43")

    await waitFor(() => expect(rankFn).toHaveBeenCalled())
    expect(uploadFn).toHaveBeenCalledWith("ada", expect.any(File))
    expect(rankFn.mock.calls[0]?.[0]).toMatchObject({
      handle: "ada",
      time: "43",
      bootScreenUrl: "/uploads/x-1.png",
    })
  })

  it("does not rank at all when the upload fails", async () => {
    uploadFn.mockResolvedValue({ ok: false, error: "That boot screen is too large." })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("ada", "43")

    expect(await screen.findByRole("alert")).toHaveTextContent("too large")
    expect(rankFn).not.toHaveBeenCalled()
  })

  it("never asks anyone to post a code to prove a handle", async () => {
    // Proof is an X sign-in now. Nothing should send someone off to compose a
    // post, paste a link back, or race a 15-minute nonce.
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.type(screen.getByLabelText(/handle/i), "ada")

    expect(screen.queryByText(/post this from that account/i)).toBeNull()
    expect(screen.queryByLabelText(/link to your post/i)).toBeNull()
    expect(screen.queryByRole("link", { name: /post on x/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /verify @/i })).toBeNull()
  })

  it("offers to sign in with X, since that is the whole of verification now", async () => {
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.click(screen.getByRole("button", { name: /sign in with x/i }))

    expect(signInFn).toHaveBeenCalledWith(expect.objectContaining({ provider: "twitter" }))
  })

  it("stops asking for a handle once one is signed in", async () => {
    // The handle is the account's, not a field: typing someone else's is
    // exactly what signing in exists to prevent.
    session = { data: { user: { handle: "ada" } } }
    render(<RankForm onSuccess={() => {}} />, { wrapper })

    expect(screen.getByText("@ada")).toBeVisible()
    expect(screen.queryByRole("textbox", { name: /handle/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /sign in with x/i })).toBeNull()
  })

  it("ranks as the signed-in account without a handle being typed", async () => {
    session = { data: { user: { handle: "ada" } } }
    rankFn.mockResolvedValue({
      ok: true,
      created: true,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: {},
      board: { entries: [] },
    })
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.type(screen.getByLabelText(/^time$/i), "43")
    await user.upload(
      document.querySelector("input[type=file]") as HTMLInputElement,
      bootScreen(),
    )
    await user.click(screen.getByRole("button", { name: /fill specs/i }))
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    await waitFor(() => expect(rankFn).toHaveBeenCalled())
    expect(rankFn.mock.calls[0]?.[0]).toMatchObject({ handle: "ada" })
    expect(uploadFn).toHaveBeenCalledWith("ada", expect.any(File))
  })

  it("names the missing time instead of showing the schema that caught it", async () => {
    // This rendered the raw zod issue array at the user:
    // [ { "origin": "string", "code": "too_small", "path": [ "time" ], … } ]
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.type(screen.getByLabelText(/handle/i), "ada")
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
    await user.type(screen.getByLabelText(/handle/i), "ada")
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

  it("refuses to submit without a boot screen", async () => {
    const user = userEvent.setup()
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await user.type(screen.getByLabelText(/handle/i), "ada")
    await user.type(screen.getByLabelText(/^time$/i), "43")
    await user.click(screen.getByRole("button", { name: /rank it/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Add a boot screen")
    expect(uploadFn).not.toHaveBeenCalled()
  })
})
