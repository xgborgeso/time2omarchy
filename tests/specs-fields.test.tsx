import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SEARCH_EXAMPLES, SpecsFields } from "@/components/SpecsFields"
import { searchCpus } from "@/lib/cpus"

// The real search, reached the way the component reaches it: this suite is
// about what the picker asks for and shows, not about the catalogue.
const cpusFn = vi.fn((query: string) => searchCpus(query))

vi.mock("@/lib/trpc", () => ({
  useTRPC: () => ({
    cpus: {
      queryOptions: (input: { query: string }) => ({
        queryKey: ["cpus", input.query],
        queryFn: () => cpusFn(input.query),
      }),
    },
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const EMPTY = { cpuId: null, ramGb: null, storage: null }

/** Opens the CPU combobox, as a person would. */
async function openPicker() {
  const user = userEvent.setup()
  render(<SpecsFields value={EMPTY} onChange={() => {}} />, { wrapper })
  await user.click(screen.getByRole("combobox", { name: /cpu/i }))
  await screen.findByPlaceholderText(/search cpus/i)
  return user
}

beforeEach(() => {
  cpusFn.mockClear()
})

describe("SpecsFields CPU picker", () => {
  it("offers no chips until something is typed", async () => {
    // 227 chips is a wall rather than a menu, and any opening selection is
    // arbitrary — whichever few show up read as the only ones there are.
    await openPicker()

    expect(screen.queryByRole("option", { name: /ryzen/i })).toBeNull()
    expect(screen.queryByRole("option", { name: /core/i })).toBeNull()
    expect(screen.queryByRole("option", { name: /^M\d/i })).toBeNull()
  })

  it("keeps the two ways out visible on an empty search", async () => {
    // Someone who cannot find their chip must never be stuck: the escape
    // hatch and the place to ask for it are both there from the start.
    await openPicker()

    expect(screen.getByRole("option", { name: /other \/ not listed/i })).toBeVisible()
    expect(screen.getByRole("link", { name: /ask for it on github/i })).toBeVisible()
  })

  it("says what to do with the empty list", async () => {
    await openPicker()
    expect(screen.getByText(/type to search/i)).toBeVisible()
    for (const example of SEARCH_EXAMPLES) {
      expect(screen.getByText(new RegExp(example, "i"))).toBeVisible()
    }
  })

  it("suggests searches that actually land", async () => {
    // A hint naming a chip the catalogue does not have would teach someone
    // the search is broken on their very first keystroke.
    for (const example of SEARCH_EXAMPLES) {
      expect(searchCpus(example).length).toBeGreaterThan(0)
    }
  })

  it("names one chip per vendor, so no vendor reads as missing", async () => {
    const vendors = SEARCH_EXAMPLES.map((e) => searchCpus(e)[0]?.vendor)
    expect([...vendors].sort()).toEqual(["AMD", "Apple", "Intel"])
  })

  it("does not ask the server for an empty query", async () => {
    // There is nothing to answer; the round trip is pure waste on every open.
    await openPicker()
    await waitFor(() => expect(cpusFn).not.toHaveBeenCalled())
  })

  it("finds a chip once its model is typed", async () => {
    const user = await openPicker()
    await user.type(screen.getByPlaceholderText(/search cpus/i), "7950x")

    expect(await screen.findByRole("option", { name: /7950X$/ })).toBeVisible()
    expect(cpusFn).toHaveBeenCalledWith("7950x")
  })
})
