"use client"

import { useEffect, useState } from "react"

/**
 * The value, but only after it has stopped changing.
 *
 * Typing "7950x" should cost one query, not five. Each keystroke restarts the
 * timer, so only the last one survives.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
