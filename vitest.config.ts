import path from "node:path"
import { defineConfig } from "vitest/config"

const alias = { "@": path.resolve(import.meta.dirname, "src") }

// esbuild handles the JSX transform, so no React plugin is needed just for tests.
const esbuild = { jsx: "automatic" } as const

export default defineConfig({
  resolve: { alias },
  esbuild,
  test: {
    // Top-level only: PGlite-backed suites write to disk and must not race.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        esbuild,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        esbuild,
        test: {
          name: "components",
          include: ["tests/**/*.test.tsx"],
          environment: "happy-dom",
          setupFiles: ["tests/setup-components.ts"],
        },
      },
    ],
  },
})
