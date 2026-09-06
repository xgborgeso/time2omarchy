import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BoardPager, pageSummary, pageWindow } from "@/components/BoardPager"

describe("pageWindow", () => {
  it("shows every page while they still fit", () => {
    expect(pageWindow(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(pageWindow(3, 3)).toEqual([1, 2, 3])
  })

  it("keeps the first, the last and where you are", () => {
    // The two numbers anyone actually wants are "where I am" and "how far
    // this goes"; forty buttons answer neither.
    const window = pageWindow(20, 40)
    expect(window[0]).toBe(1)
    expect(window.at(-1)).toBe(40)
    expect(window).toContain(20)
    expect(window).toContain(19)
    expect(window).toContain(21)
  })

  it("marks every skip with a gap, and never two in a row", () => {
    const window = pageWindow(20, 40)
    expect(window).toContain("gap")
    for (const [i, item] of window.entries()) {
      if (item === "gap") expect(window[i + 1]).not.toBe("gap")
    }
  })

  it("needs no gap at the ends, where the window already reaches", () => {
    // Page 2 of 40 neighbours page 1, so there is nothing skipped in front.
    expect(pageWindow(2, 40)[0]).toBe(1)
    expect(pageWindow(2, 40)[1]).toBe(2)
    expect(pageWindow(39, 40).at(-2)).toBe(39)
  })

  it("never lists a page twice", () => {
    for (const page of [1, 2, 5, 20, 39, 40]) {
      const numbers = pageWindow(page, 40).filter((n) => n !== "gap")
      expect(new Set(numbers).size).toBe(numbers.length)
    }
  })
})

describe("pageSummary", () => {
  it("counts the slice, not the page", () => {
    expect(pageSummary(1, 50, 2088)).toBe("1–50 of 2,088")
    expect(pageSummary(2, 50, 2088)).toBe("51–100 of 2,088")
  })

  it("stops the last page overrunning the total", () => {
    expect(pageSummary(42, 50, 2088)).toBe("2,051–2,088 of 2,088")
  })

  it("says so rather than counting to zero", () => {
    expect(pageSummary(1, 50, 0)).toBe("Nothing ranked yet")
  })
})

describe("BoardPager", () => {
  it("draws nothing at all before anything is ranked", () => {
    const { container } = render(
      <BoardPager page={1} perPage={50} total={0} onPage={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("keeps the count on one page, but not the buttons", () => {
    // One page is not a pager. The count still earns its place: it is the
    // only thing saying how big the board is.
    render(<BoardPager page={1} perPage={50} total={12} onPage={() => {}} />)
    expect(screen.getByText("1–12 of 12")).toBeVisible()
    expect(screen.queryByRole("button", { name: /go to page/i })).toBeNull()
  })

  it("moves to the page that was clicked", async () => {
    const onPage = vi.fn()
    render(<BoardPager page={1} perPage={50} total={500} onPage={onPage} />)

    await userEvent.setup().click(screen.getByRole("button", { name: /go to page 2/i }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it("disables the way back from the first page, and on from the last", () => {
    // Disabled rather than removed, so the row does not reflow under the
    // cursor as somebody pages through it.
    const { rerender } = render(
      <BoardPager page={1} perPage={50} total={500} onPage={() => {}} />,
    )
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled()

    rerender(<BoardPager page={10} perPage={50} total={500} onPage={() => {}} />)
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled()
  })

  it("steps one page at a time from the middle", async () => {
    const onPage = vi.fn()
    render(<BoardPager page={5} perPage={50} total={500} onPage={onPage} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /previous/i }))
    expect(onPage).toHaveBeenCalledWith(4)

    await user.click(screen.getByRole("button", { name: /next/i }))
    expect(onPage).toHaveBeenCalledWith(6)
  })

  it("marks the page you are on, for anyone not seeing the highlight", () => {
    render(<BoardPager page={3} perPage={50} total={500} onPage={() => {}} />)
    expect(screen.getByRole("button", { name: /go to page 3/i })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })
})
