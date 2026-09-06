import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The rank form, behind X.
 *
 * The gate is here rather than inside the form because going to X is a page
 * navigation and a `File` cannot survive one — anyone who filled the form
 * first would come back to an empty file picker. So the only order that works
 * is asking before there is anything to lose, and that ordering is what this
 * file pins.
 */
let me: { handle: string } | null = null
const socialSignIn = vi.fn(
  async () => ({ error: null }) as { error: { message?: string } | null },
)
const toastError = vi.fn()

vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m) } }))
vi.mock("@/lib/auth-client", () => ({ signIn: { social: socialSignIn } }))
vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    me: { queryOptions: () => ({ queryKey: ["me"], queryFn: async () => me }) },
  }),
}))

/** The form has its own suite; here it only needs to report a success. */
vi.mock("@/components/RankForm", () => ({
  RankForm: ({
    onSuccess,
    onDone,
  }: {
    onSuccess: (r: unknown) => void
    onDone?: () => void
  }) => (
    <>
      <button type="button" onClick={() => onSuccess({ ok: true })}>
        pretend to rank
      </button>
      <button type="button" onClick={() => onDone?.()}>
        pretend to close
      </button>
    </>
  ),
}))

const { RankDialog } = await import("@/components/RankDialog")

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  me = null
  socialSignIn.mockClear()
  socialSignIn.mockResolvedValue({ error: null })
  toastError.mockClear()
  window.history.replaceState(null, "", "/")
})

describe("before anyone is signed in", () => {
  it("sends the first press to X rather than opening the form", async () => {
    render(<RankDialog onSuccess={() => {}} />, { wrapper })

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: /rank your install/i }))
    await waitFor(() => expect(socialSignIn).toHaveBeenCalled())
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("comes back to the board with the form open, not to the top of the page", async () => {
    render(<RankDialog onSuccess={() => {}} />, { wrapper })
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: /rank your install/i }))

    await waitFor(() =>
      expect(socialSignIn).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "twitter", callbackURL: "/?rank=1" }),
      ),
    )
  })

  it("says so when X could not be reached, and gives the button back", async () => {
    socialSignIn.mockResolvedValueOnce({ error: { message: "X is down." } })
    render(<RankDialog onSuccess={() => {}} />, { wrapper })

    const button = await screen.findByRole("button", { name: /rank your install/i })
    await userEvent.setup().click(button)

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("X is down."))
    await waitFor(() => expect(button).toBeEnabled())
  })

  it("falls back to its own wording when the error carries none", async () => {
    socialSignIn.mockResolvedValueOnce({ error: {} })
    render(<RankDialog onSuccess={() => {}} />, { wrapper })

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: /rank your install/i }))
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not reach x/i)),
    )
  })
})

describe("once signed in", () => {
  it("opens the form straight away, named after the account", async () => {
    me = { handle: "ada" }
    render(<RankDialog onSuccess={() => {}} />, { wrapper })

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: /rank your install/i }))
    expect(await screen.findByRole("dialog")).toBeVisible()
    expect(screen.getByText(/rank your install as @ada/i)).toBeInTheDocument()
    expect(socialSignIn).not.toHaveBeenCalled()
  })

  it("retitles itself once an entry is placed", async () => {
    // A heading still telling you to rank describes a form that is no longer
    // on screen.
    me = { handle: "ada" }
    render(<RankDialog onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: /rank your install/i }))
    await user.click(await screen.findByRole("button", { name: /pretend to rank/i }))
    expect(await screen.findByText("Ranked")).toBeInTheDocument()
  })

  it("hands the result up", async () => {
    me = { handle: "ada" }
    const onSuccess = vi.fn()
    render(<RankDialog onSuccess={onSuccess} />, { wrapper })
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: /rank your install/i }))
    await user.click(await screen.findByRole("button", { name: /pretend to rank/i }))
    expect(onSuccess).toHaveBeenCalledWith({ ok: true })
  })

  it("offers the form again on reopening, not the last result", async () => {
    me = { handle: "ada" }
    render(<RankDialog onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: /rank your install/i }))
    await user.click(await screen.findByRole("button", { name: /pretend to rank/i }))
    await screen.findByText("Ranked")

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    await user.click(screen.getByRole("button", { name: /rank your install/i }))
    expect(await screen.findByText(/rank your install as @ada/i)).toBeInTheDocument()
  })
})

describe("coming back from X", () => {
  it("reopens the form, and drops the marker from the url", async () => {
    // The redirect reloads the page, so the click that started this is gone.
    // Left in place, a reload months later would pop the form open for no
    // reason at all.
    me = { handle: "ada" }
    window.history.replaceState(null, "", "/?rank=1")
    render(<RankDialog onSuccess={() => {}} />, { wrapper })

    expect(await screen.findByRole("dialog")).toBeVisible()
    expect(window.location.search).not.toContain("rank")
  })

  it("keeps any other query it was carrying", async () => {
    me = { handle: "ada" }
    window.history.replaceState(null, "", "/?ref=x&rank=1")
    render(<RankDialog onSuccess={() => {}} />, { wrapper })

    await screen.findByRole("dialog")
    expect(window.location.search).toContain("ref=x")
    expect(window.location.search).not.toContain("rank")
  })
})

describe("closing from inside", () => {
  it("closes when the form says there is nothing left to do", async () => {
    // The result card carries the share button, so the dialog is deliberately
    // not closed on success — only when the form asks.
    me = { handle: "ada" }
    render(<RankDialog onSuccess={() => {}} />, { wrapper })
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: /rank your install/i }))
    await screen.findByRole("dialog")

    await user.click(screen.getByRole("button", { name: /pretend to close/i }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})
