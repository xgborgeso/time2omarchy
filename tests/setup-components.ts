import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Unmount between tests; happy-dom keeps one document for the whole file.
afterEach(cleanup)
