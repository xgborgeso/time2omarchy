import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebounced } from "@/lib/use-debounced"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useDebounced", () => {
  it("returns the initial value straight away", () => {
    const { result } = renderHook(() => useDebounced("ryzen", 200))
    expect(result.current).toBe("ryzen")
  })

  it("holds the old value until the delay has passed", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 200), {
      initialProps: { v: "a" },
    })
    rerender({ v: "ab" })
    expect(result.current).toBe("a")

    act(() => void vi.advanceTimersByTime(199))
    expect(result.current).toBe("a")

    act(() => void vi.advanceTimersByTime(1))
    expect(result.current).toBe("ab")
  })

  it("emits once for a burst of typing, not once per keystroke", () => {
    // This is the whole point: one request for "7950x", not five.
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 200), {
      initialProps: { v: "" },
    })
    for (const v of ["7", "79", "795", "7950", "7950x"]) {
      rerender({ v })
      act(() => void vi.advanceTimersByTime(50))
    }
    expect(result.current).toBe("")

    act(() => void vi.advanceTimersByTime(200))
    expect(result.current).toBe("7950x")
  })
})
