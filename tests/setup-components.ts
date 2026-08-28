import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { afterEach, vi } from "vitest"

// Unmount between tests; happy-dom keeps one document for the whole file.
afterEach(cleanup)

/**
 * Recharts measures its parent before drawing, and a headless DOM reports
 * every element as 0×0 — so a chart renders nothing at all unless the
 * container is given a size. This is the standard shim for testing it.
 */
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts")
  return {
    ...actual,
    // createElement rather than JSX: this file is .ts, not .tsx.
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      createElement("div", { style: { width: 640, height: 320 } }, children),
  }
})
