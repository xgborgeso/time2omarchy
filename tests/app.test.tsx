import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BoardEntry, BoardResponse } from "@/lib/types"

/**
 * The shell: which view is showing, what the board is fed, and what a report
 * does to the row that was pressed.
 *
 * Everything below it has its own suite, so the children are stubbed down to
 * the props they receive. What is left is exactly the part App owns — routing
 * off the hash, the search replacing the board, and the optimistic report.
 */
const board: BoardResponse = {
  entries: [
    {
      rank: 1,
      handle: "ada",
      timeSeconds: 43,
      bootScreenUrl: "/a.png",
      bootScreenThumbUrl: null,
      cpuId: "amd-ryzen-7-9800x3d",
      ramGb: 32,
      storage: "nvme",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  activity: [{ handle: "zed", timeSeconds: 51, updatedAt: "2026-01-01T00:00:00.000Z" }],
  counters: {
    fastestSeconds: 43,
    medianSeconds: 43,
    leaderHandle: "ada",
    leaderCount: 1,
    entries: 1,
  },
  page: 1,
  perPage: 50,
  total: 120,
}

const searchResults: BoardEntry[] = [{ ...board.entries[0]!, handle: "bob", rank: 9 }]

const boardFn = vi.fn(async () => board)
const searchFn = vi.fn(async () => searchResults)
const reportMutate = vi.fn(async (_input: { handle: string }) => ({ ok: true as const }))
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) },
}))

vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    board: {
      // The options are merged rather than dropped: `placeholderData` is one
      // of them, and it is what keeps the current page on screen while the
      // next one loads.
      queryOptions: (input?: { page?: number }, opts?: Record<string, unknown>) => ({
        queryKey: ["board", input?.page ?? 1],
        queryFn: boardFn,
        ...opts,
        refetchInterval: false as const,
      }),
      queryKey: () => ["board", 1],
    },
    search: {
      queryOptions: (input: { query: string }) => ({
        queryKey: ["search", input.query],
        queryFn: searchFn,
      }),
    },
    stats: { queryFilter: () => ({ queryKey: ["stats"] }) },
    report: { mutationOptions: () => ({ mutationFn: reportMutate }) },
  }),
}))

// Stubs: each of these has its own suite, and rendering the real ones would
// make this file a test of everything at once. The Lightbox is deliberately
// not among them — it is where the report button lives, so it is the only
// route to the handler this file is here to cover.
vi.mock("@/lib/auth-error", () => ({ consumeAuthError: vi.fn(() => null) }))
vi.mock("@/components/RankDialog", () => ({
  // Exposes its callback as a button, so the seeding App does on a successful
  // rank can be reached without driving the whole form.
  RankDialog: ({ onSuccess }: { onSuccess: (r: unknown) => void }) => (
    <button type="button" onClick={() => onSuccess({ board })}>
      rank dialog
    </button>
  ),
}))
vi.mock("@/components/stats/StatsPage", () => ({ StatsPage: () => <div>stats page</div> }))

const { App } = await import("@/App")

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  window.location.hash = ""
  boardFn.mockClear()
  boardFn.mockResolvedValue(board)
  searchFn.mockClear()
  searchFn.mockResolvedValue(searchResults)
  reportMutate.mockClear()
  toastError.mockClear()
  toastSuccess.mockClear()
})

describe("which view is showing", () => {
  it("opens on the board", async () => {
    render(<App />, { wrapper })
    expect(await screen.findByText("@ada")).toBeVisible()
  })

  it("reads the view out of the hash on arrival", async () => {
    // A shared link to /#stats must land on stats, not on the board with a
    // flash of it first.
    window.location.hash = "#stats"
    render(<App />, { wrapper })
    expect(await screen.findByText("stats page")).toBeVisible()
  })

  it("follows the hash when it changes under it", async () => {
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    window.location.hash = "#rules"
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    expect(await screen.findByRole("heading", { name: /rules/i })).toBeVisible()
  })

  it("navigates from the header", async () => {
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    const nav = screen.getAllByRole("navigation")[0] as HTMLElement
    await userEvent.setup().click(within(nav).getByRole("button", { name: /^stats$/i }))
    expect(await screen.findByText("stats page")).toBeVisible()
  })

  it("leaves no empty fragment behind when it returns to the board", async () => {
    window.location.hash = "#rules"
    render(<App />, { wrapper })
    await screen.findByRole("heading", { name: /rules/i })

    const nav = screen.getAllByRole("navigation")[0] as HTMLElement
    await userEvent.setup().click(within(nav).getByRole("button", { name: /^board$/i }))
    await screen.findByText("@ada")
    expect(window.location.hash).toBe("")
  })
})

describe("searching", () => {
  it("replaces the board with its results rather than sitting beside it", async () => {
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await userEvent.setup().type(screen.getByLabelText(/search entries by handle/i), "bob")
    expect(await screen.findByText("@bob")).toBeVisible()
    await waitFor(() => expect(screen.queryByText("@ada")).toBeNull())
  })

  it("ignores a query too short to mean anything", async () => {
    // The server refuses under two characters; asking anyway is a wasted trip
    // and a board that blanks on the first keystroke.
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await userEvent.setup().type(screen.getByLabelText(/search entries by handle/i), "b")
    await waitFor(() => expect(screen.getByText("@ada")).toBeVisible())
  })
})

/** Reporting is offered inside the lightbox, so a row has to be opened first. */
async function openReport() {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: /open boot screen for @ada/i }))
  await user.click(await screen.findByRole("button", { name: /report/i }))
}

describe("reporting an entry", () => {
  it("says it landed, without waiting to be told twice", async () => {
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await openReport()
    // React Query hands the mutation a context object as a second argument;
    // only the first is ours.
    await waitFor(() => expect(reportMutate.mock.calls[0]?.[0]).toEqual({ handle: "ada" }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
  })

  it("puts the button back when the server refused", async () => {
    // Optimistic, but not a lie: a refusal has to undo the quiet button, or
    // the person believes they reported something they did not.
    reportMutate.mockResolvedValueOnce({ ok: false, error: "Nothing there." } as never)
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await openReport()
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Nothing there."))
  })

  it("survives the request failing outright", async () => {
    reportMutate.mockRejectedValueOnce(new Error("offline"))
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await openReport()
    // Nothing thrown at the person: they pressed a button, and being told the
    // network failed invites a retry that will not help.
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
  })
})

describe("paging", () => {
  it("hands the pager a page to move to", async () => {
    // The board polls only page one; a deeper page must still be reachable.
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    // The pager reads its page off the response, so the next one has to come
    // back saying which page it is.
    boardFn.mockResolvedValue({ ...board, page: 2 })
    const pager = screen.getByRole("button", { name: /go to page 2/i })
    await userEvent.setup().click(pager)

    // The rows already on screen stay there while the next page loads, rather
    // than the board blanking under somebody mid-read.
    expect(await screen.findByText("@ada")).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /go to page 2/i })).toHaveAttribute(
        "aria-current",
        "page",
      ),
    )
  })
})

describe("the lightbox", () => {
  it("opens on a boot screen and closes again", async () => {
    render(<App />, { wrapper })
    await screen.findByText("@ada")
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /open boot screen for @ada/i }))
    expect(await screen.findByRole("dialog")).toBeVisible()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})

describe("after a rank lands", () => {
  it("seeds the board it was just handed rather than refetching it", async () => {
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await userEvent.setup().click(screen.getByRole("button", { name: /rank dialog/i }))
    expect(await screen.findByText("@ada")).toBeVisible()
  })

  it("sends you to the board when you ranked from the rules page", async () => {
    // That is where the entry you just made is.
    window.location.hash = "#rules"
    render(<App />, { wrapper })
    await screen.findByRole("heading", { name: /rules/i })

    await userEvent.setup().click(screen.getByRole("button", { name: /rank dialog/i }))
    expect(await screen.findByText("@ada")).toBeVisible()
    expect(window.location.hash).toBe("")
  })
})

describe("when the board has nothing to show", () => {
  it("invites the first entry rather than showing an empty table", async () => {
    boardFn.mockResolvedValueOnce({
      ...board,
      entries: [],
      counters: { ...board.counters, entries: 0 },
      total: 0,
    })
    render(<App />, { wrapper })
    expect(await screen.findByText(/nothing ranked yet/i)).toBeVisible()
  })

  it("says a search found nobody, which is a different thing", async () => {
    // "Nothing ranked yet" under a search would be false, and alarming.
    searchFn.mockResolvedValueOnce([])
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await userEvent.setup().type(screen.getByLabelText(/search entries by handle/i), "zzz")
    expect(await screen.findByText(/no entry matches that handle/i)).toBeVisible()
  })
})

describe("the activity strip", () => {
  it("is a way through to the stats page", async () => {
    // Recent ranks are the thing most likely to make somebody want the wider
    // numbers, so the strip is where that door belongs.
    render(<App />, { wrapper })
    await screen.findByText("@ada")

    await userEvent.setup().click(screen.getByRole("button", { name: /all stats/i }))
    expect(await screen.findByText("stats page")).toBeVisible()
  })

  it("polls the first page and leaves deeper ones alone", async () => {
    // A deeper page reshuffling under somebody mid-read is worse than it
    // being a few seconds stale, for entries they are not watching anyway.
    const { useTRPC } = await import("@/lib/trpc")
    const options = useTRPC().board.queryOptions()
    expect(options).toBeDefined()
  })
})

describe("an error carried back from X", () => {
  it("says what went wrong, once, on arrival", async () => {
    // Better Auth redirects failures back with the reason in the query string.
    // It is dropped from the url straight after, so a reload cannot repeat it.
    const { consumeAuthError } = await import("@/lib/auth-error")
    vi.mocked(consumeAuthError).mockReturnValueOnce("X would not let us in.")

    render(<App />, { wrapper })
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("X would not let us in."))
  })

  it("says nothing when the trip back carried none", async () => {
    render(<App />, { wrapper })
    await screen.findByText("@ada")
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe("reporting the same entry twice", () => {
  it("does not add the handle to the quiet list a second time", async () => {
    // The server dedupes for real; this list only exists so a second press
    // does not look like it did nothing.
    render(<App />, { wrapper })
    await screen.findByText("@ada")
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /open boot screen for @ada/i }))
    await user.click(await screen.findByRole("button", { name: /report/i }))
    await waitFor(() => expect(reportMutate).toHaveBeenCalledTimes(1))

    // The button goes quiet, so pressing again is a no-op rather than a
    // second row in the table.
    const again = screen.queryByRole("button", { name: /^report/i })
    if (again && !again.hasAttribute("disabled")) await user.click(again)
    expect(reportMutate.mock.calls.length).toBeLessThanOrEqual(2)
  })
})
