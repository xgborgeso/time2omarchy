import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RankForm } from "@/components/RankForm"

const rankFn = vi.fn()
const claimFn = vi.fn()
const uploadFn = vi.fn()

vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    rank: { mutationOptions: () => ({ mutationFn: rankFn }) },
    claim: { mutationOptions: () => ({ mutationFn: claimFn }) },
  }),
}))

vi.mock("@/lib/upload", () => ({
  uploadBootScreen: (...args: unknown[]) => uploadFn(...args),
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
async function submit(handle: string, time: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/handle/i), handle)
  await user.type(screen.getByLabelText(/^time$/i), time)
  await user.upload(
    document.querySelector("input[type=file]") as HTMLInputElement,
    bootScreen(),
  )
  await user.click(screen.getByRole("button", { name: /rank it/i }))
  return user
}

beforeEach(() => {
  rankFn.mockReset()
  claimFn.mockReset()
  uploadFn.mockReset()
  uploadFn.mockResolvedValue({ ok: true, url: "/uploads/x-1.png" })
})

describe("RankForm", () => {
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

  it("asks for proof when the handle is taken, without the user requesting it", async () => {
    rankFn.mockResolvedValue({
      ok: false,
      error: "@ada is already on the board.",
      field: "handle",
      needsProof: true,
    })
    claimFn.mockResolvedValue({
      ok: true,
      nonce: "t2o-abc123",
      text: "Verifying my time2omarchy entry: t2o-abc123",
      expiresAt: "2026-01-01T00:00:00.000Z",
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("ada", "43")

    expect(await screen.findByRole("alert")).toHaveTextContent("already on the board")
    // The proof panel appears with the exact text to post.
    expect(
      await screen.findByText("Verifying my time2omarchy entry: t2o-abc123"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/link to your post/i)).toBeInTheDocument()
    expect(claimFn.mock.calls[0]?.[0]).toEqual({ handle: "ada" })
  })

  it("sends the nonce and post url once proof has been pasted", async () => {
    rankFn.mockResolvedValueOnce({
      ok: false,
      error: "@ada is already on the board.",
      needsProof: true,
    })
    claimFn.mockResolvedValue({
      ok: true,
      nonce: "t2o-abc123",
      text: "Verifying my time2omarchy entry: t2o-abc123",
      expiresAt: "2026-01-01T00:00:00.000Z",
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    const user = await submit("ada", "43")

    const postUrl = await screen.findByLabelText(/link to your post/i)
    await user.type(postUrl, "https://x.com/ada/status/20")

    rankFn.mockResolvedValueOnce({
      ok: true,
      created: false,
      improved: true,
      keptBest: false,
      bestTimeSeconds: 43,
      entry: {},
      board: { entries: [] },
    })
    await user.click(screen.getByRole("button", { name: /verify & rank/i }))

    await waitFor(() => expect(rankFn).toHaveBeenCalledTimes(2))
    expect(rankFn.mock.calls[1]?.[0]).toMatchObject({
      nonce: "t2o-abc123",
      postUrl: "https://x.com/ada/status/20",
    })
  })

  it("relabels the button once proof is required", async () => {
    rankFn.mockResolvedValue({ ok: false, error: "taken", needsProof: true })
    claimFn.mockResolvedValue({
      ok: true,
      nonce: "n",
      text: "t",
      expiresAt: "2026-01-01T00:00:00.000Z",
    })
    render(<RankForm onSuccess={() => {}} />, { wrapper })
    await submit("ada", "43")

    expect(
      await screen.findByRole("button", { name: /verify & rank/i }),
    ).toBeInTheDocument()
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
