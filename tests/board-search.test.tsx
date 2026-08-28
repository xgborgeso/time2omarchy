import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BoardSearch } from "@/components/BoardSearch"

describe("BoardSearch", () => {
  it("says how many entries the board is showing for a search", async () => {
    render(<BoardSearch value="void" term="void" onChange={() => {}} results={3} />)
    expect(screen.getByText(/3 entries matching “void”/)).toBeVisible()
  })

  it("says so plainly when a search matches nothing", async () => {
    render(<BoardSearch value="nobody" term="nobody" onChange={() => {}} results={0} />)
    expect(screen.getByText(/no entry matches “nobody”/i)).toBeVisible()
  })

  it("counts one entry in the singular, since most searches find one", async () => {
    render(<BoardSearch value="xgbor" term="xgbor" onChange={() => {}} results={1} />)
    expect(screen.getByText(/1 entry matching/)).toBeVisible()
  })

  it("reports nothing at all until a search is long enough to run", async () => {
    // The server ignores a single character, so claiming a result count for
    // one would be reporting on a request that never happened.
    render(<BoardSearch value="v" onChange={() => {}} results={null} />)
    expect(screen.queryByText(/matching/)).toBeNull()
  })

  it("says nothing while a search is still on its way", async () => {
    // Typing is debounced, so for a moment the field holds a query the count
    // does not describe yet. It used to render "undefined entries matching".
    render(<BoardSearch value="voidnom" onChange={() => {}} results={null} />)
    expect(screen.queryByText(/undefined/)).toBeNull()
    expect(screen.queryByText(/matching|no entry/i)).toBeNull()
  })

  it("quotes the term the count is actually about", async () => {
    // Mid-debounce the field says "voidnom" while the results are for "void".
    // Quoting the field would attribute a count to a query that never ran.
    render(<BoardSearch value="voidnom" term="void" onChange={() => {}} results={2} />)
    expect(screen.getByText(/2 entries matching “void”/)).toBeVisible()
  })

  it("offers a way out once something has been typed", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<BoardSearch value="void" term="void" onChange={onChange} results={2} />)
    await user.click(screen.getByRole("button", { name: /clear the search/i }))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("shows no clear button on an empty field, which has nothing to clear", async () => {
    render(<BoardSearch value="" onChange={() => {}} results={null} />)
    expect(screen.queryByRole("button", { name: /clear the search/i })).toBeNull()
  })
})
