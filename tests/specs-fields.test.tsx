import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SEARCH_EXAMPLES, SpecsFields } from "@/components/SpecsFields"
import { searchCpus } from "@/lib/cpus"
import type { Specs } from "@/lib/specs"

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

const EMPTY = { cpuId: null, cpuOther: null, ramGb: null, storage: null }

/** Opens the CPU combobox, as a person would. */
async function openPicker(onChange: (next: Specs) => void = () => {}) {
  const user = userEvent.setup()
  render(<SpecsFields value={EMPTY} onChange={onChange} />, { wrapper })
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

  it("keeps the way out visible on an empty search", async () => {
    // Someone who cannot find their chip must never be stuck, and the way out
    // is on this page — not an issue tracker they would have to leave for.
    await openPicker()

    expect(screen.getByRole("option", { name: /other \/ not listed/i })).toBeVisible()
    expect(screen.getByText(/that is what the list grows from/i)).toBeVisible()
    expect(screen.queryByRole("link", { name: /github/i })).toBeNull()
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

  it("asks which chip it was, once Other is chosen", async () => {
    // "other" on its own records that the list failed without recording what
    // it failed at — which is why the list could never be grown from it.
    let specs: Specs = EMPTY
    const user = await openPicker((next) => {
      specs = next
    })
    await user.click(screen.getByRole("option", { name: /other \/ not listed/i }))

    expect(specs.cpuId).toBe("other")

    render(<SpecsFields value={specs} onChange={() => {}} />, { wrapper })
    expect(screen.getByRole("textbox", { name: /which cpu/i })).toBeVisible()
  })

  it("carries the failed search into the field, rather than asking twice", async () => {
    let specs: Specs = EMPTY
    const user = await openPicker((next) => {
      specs = next
    })
    await user.type(screen.getByPlaceholderText(/search cpus/i), "N100")
    await user.click(await screen.findByRole("option", { name: /other \/ not listed/i }))

    expect(specs.cpuOther).toBe("N100")
  })

  it("drops the note when a listed chip is picked after all", async () => {
    // A note left behind would contradict the id beside it, and go on asking
    // for a chip the catalogue already has.
    let specs: Specs = EMPTY
    const user = await openPicker((next) => {
      specs = next
    })
    await user.type(screen.getByPlaceholderText(/search cpus/i), "7950x")
    await user.click(await screen.findByRole("option", { name: /7950X$/ }))

    expect(specs.cpuId).toBe("amd-ryzen-9-7950x")
    expect(specs.cpuOther).toBeNull()
  })

  it("offers the real chip when the typed name turns out to be one", async () => {
    // The first request the board ever received was "AMD AI Proc" — two words
    // from a listed chip, filed as a gap. Offered, never applied: what goes on
    // an entry stays the person's choice.
    let specs: Specs = { ...EMPTY, cpuId: "other", cpuOther: "" }
    const rerender = (next: Specs) => {
      specs = next
    }
    render(
      <SpecsFields
        value={{ ...EMPTY, cpuId: "other", cpuOther: "7950x" }}
        onChange={rerender}
      />,
      {
        wrapper,
      },
    )

    const offer = await screen.findByRole("button", { name: /AMD Ryzen 9 7950X$/ })
    expect(offer).toBeVisible()

    await userEvent.setup().click(offer)
    expect(specs.cpuId).toBe("amd-ryzen-9-7950x")
    expect(specs.cpuOther).toBeNull()
  })

  it("asks for a model number before anything is typed, not after", async () => {
    // Instructions, not a correction: worth more before somebody writes
    // "AMD AI Proc" than after they already have.
    render(
      <SpecsFields
        value={{ ...EMPTY, cpuId: "other", cpuOther: null }}
        onChange={() => {}}
      />,
      { wrapper },
    )
    expect(await screen.findByText(/your machine knows the exact name/i)).toBeVisible()
    expect(screen.getByText(/the next person with this chip/i)).toBeVisible()
  })

  it("clears the ask once the answer carries a model number", async () => {
    render(
      <SpecsFields
        value={{ ...EMPTY, cpuId: "other", cpuOther: "Fictional Q9 9999" }}
        onChange={() => {}}
      />,
      { wrapper },
    )
    expect(await screen.findByText(/the next person with this chip/i)).toBeVisible()
    expect(screen.queryByText(/your machine knows the exact name/i)).toBeNull()
  })

  it("asks for a model number when the answer names only a range", async () => {
    render(
      <SpecsFields
        value={{ ...EMPTY, cpuId: "other", cpuOther: "some chip" }}
        onChange={() => {}}
      />,
      { wrapper },
    )
    expect(await screen.findByText(/your machine knows the exact name/i)).toBeVisible()
    // Stacked under the reason, not swapping it out: the answer to "why must
    // I fill this in" must not vanish at the moment someone is struggling to.
    expect(screen.getByText(/the next person with this chip/i)).toBeVisible()
  })

  it("says why it is asking, not what we do with it, once the answer looks usable", async () => {
    render(
      <SpecsFields
        value={{ ...EMPTY, cpuId: "other", cpuOther: "Fictional Q9 9999" }}
        onChange={() => {}}
      />,
      { wrapper },
    )
    expect(await screen.findByText(/the next person with this chip/i)).toBeVisible()
    // Our queue and our review are not the person's problem, and a form that
    // describes its own back office is a form nobody finishes reading.
    expect(screen.queryByText(/checked by hand|added to the list/i)).toBeNull()
  })

  it("finds a chip once its model is typed", async () => {
    const user = await openPicker()
    await user.type(screen.getByPlaceholderText(/search cpus/i), "7950x")

    expect(await screen.findByRole("option", { name: /7950X$/ })).toBeVisible()
    expect(cpusFn).toHaveBeenCalledWith("7950x")
  })
})

describe("typing into the Other field", () => {
  it("hands each keystroke up, and an empty box as nothing at all", async () => {
    // An empty box and an absent one mean the same thing, and only one of
    // them should ever reach the column.
    let specs: Specs = { ...EMPTY, cpuId: "other", cpuOther: null }
    const { rerender } = render(
      <SpecsFields
        value={specs}
        onChange={(next) => {
          specs = next
        }}
      />,
      { wrapper },
    )

    const field = screen.getByRole("textbox", { name: /which cpu/i })
    await userEvent.setup().type(field, "N")
    expect(specs.cpuOther).toBe("N")

    rerender(
      <SpecsFields
        value={{ ...EMPTY, cpuId: "other", cpuOther: "N" }}
        onChange={(next) => {
          specs = next
        }}
      />,
    )
    await userEvent.setup().clear(screen.getByRole("textbox", { name: /which cpu/i }))
    expect(specs.cpuOther).toBeNull()
  })
})

describe("memory and drive", () => {
  it("hands up the size that was chosen", async () => {
    let specs: Specs = EMPTY
    render(
      <SpecsFields
        value={EMPTY}
        onChange={(next) => {
          specs = next
        }}
      />,
      { wrapper },
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole("combobox", { name: /ram/i }))
    await user.click(await screen.findByRole("option", { name: "32 GB" }))
    expect(specs.ramGb).toBe(32)
  })

  it("hands up the drive that was chosen", async () => {
    // NVMe against HDD explains more of the gap between two entries than
    // anything else on the line, so it is asked for rather than inferred.
    let specs: Specs = EMPTY
    render(
      <SpecsFields
        value={EMPTY}
        onChange={(next) => {
          specs = next
        }}
      />,
      { wrapper },
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole("combobox", { name: /storage/i }))
    await user.click(await screen.findByRole("option", { name: "HDD" }))
    expect(specs.storage).toBe("hdd")
  })
})

describe("undoing a chip that was already chosen", () => {
  it("clears the field when the current chip is picked again", async () => {
    // So the field can be undone without reloading the page.
    let specs: Specs = { ...EMPTY, cpuId: "amd-ryzen-9-7950x" }
    const user = userEvent.setup()
    render(
      <SpecsFields
        value={specs}
        onChange={(next) => {
          specs = next
        }}
      />,
      { wrapper },
    )

    await user.click(screen.getByRole("combobox", { name: /cpu/i }))
    await user.type(screen.getByPlaceholderText(/search cpus/i), "7950x")
    await user.click(await screen.findByRole("option", { name: /7950X$/ }))

    expect(specs.cpuId).toBeNull()
  })

  it("ticks the chip that is currently chosen", async () => {
    const user = userEvent.setup()
    render(
      <SpecsFields value={{ ...EMPTY, cpuId: "amd-ryzen-9-7950x" }} onChange={() => {}} />,
      { wrapper },
    )

    await user.click(screen.getByRole("combobox", { name: /cpu/i }))
    await user.type(screen.getByPlaceholderText(/search cpus/i), "7950x")
    const option = await screen.findByRole("option", { name: /7950X$/ })
    expect(option.querySelector(".opacity-100")).not.toBeNull()
  })

  it("shows the memory already chosen rather than the placeholder", async () => {
    render(
      <SpecsFields value={{ ...EMPTY, ramGb: 64, storage: "nvme" }} onChange={() => {}} />,
      { wrapper },
    )
    expect(screen.getByRole("combobox", { name: /ram/i })).toHaveTextContent("64 GB")
    expect(screen.getByRole("combobox", { name: /storage/i })).toHaveTextContent("NVMe")
  })
})
