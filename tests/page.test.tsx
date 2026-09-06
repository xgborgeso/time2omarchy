import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

/**
 * The one route, and the shell around it.
 *
 * Both are thin, and both carry a decision that only shows up in production:
 * the page prefetches the board so a crawler and a first paint get HTML with
 * the leaderboard already in it, and the layout is where every share tag and
 * the analytics gate live.
 */
const prefetchQuery = vi.fn(async () => {})
const boardQueryOptions = vi.fn(() => ({ queryKey: ["board"] }))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-query")
  return {
    ...actual,
    dehydrate: () => ({ queries: [] }),
    HydrationBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})
vi.mock("@/lib/trpc-server", () => ({
  getQueryClient: () => ({ prefetchQuery }),
  trpc: { board: { queryOptions: boardQueryOptions } },
}))
vi.mock("@/App", () => ({ App: () => <div>the board</div> }))
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans", className: "font-sans" }),
}))

const { default: Page, revalidate } = await import("../app/page")

describe("the page", () => {
  it("is regenerated on a schedule rather than per request", async () => {
    // A leaderboard is read far more than it is written. Live visitors get
    // fresh data from the client's own polling; everyone else gets static
    // HTML off the CDN.
    expect(revalidate).toBe(60)
  })

  it("prefetches the board so the html arrives with it already in", async () => {
    const element = await Page()
    expect(prefetchQuery).toHaveBeenCalledTimes(1)
    expect(boardQueryOptions).toHaveBeenCalled()

    render(element)
    expect(screen.getByText("the board")).toBeVisible()
  })
})
