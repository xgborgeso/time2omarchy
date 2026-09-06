import path from "node:path"
import { defineConfig } from "vitest/config"

const alias = { "@": path.resolve(import.meta.dirname, "src") }

// esbuild handles the JSX transform, so no React plugin is needed just for tests.
const esbuild = { jsx: "automatic" } as const

export default defineConfig({
  resolve: { alias },
  esbuild,
  test: {
    /**
     * What the suite is measured against.
     *
     * Scoped to the code this project actually wrote. `src/components/ui` is
     * shadcn's, vendored rather than authored, and testing a library's own
     * primitives measures the library. Config and generated files carry no
     * branches worth proving. A generated route handler has no
     * branch of ours to prove.
     *
     * Thresholds fail the run rather than print a number nobody reads: a
     * suite that quietly stops covering a file is how a regression ships.
     */
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "json", "html"],
      include: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: [
        // shadcn's, vendored rather than authored. Testing a library's own
        // primitives measures the library.
        "src/components/ui/**",
        "**/*.d.ts",
        // Route files that re-export a framework handler and nothing else —
        // `export const { GET, POST } = createRouteHandler(...)`. Covering
        // them means running Next's server runtime to prove Next works. The
        // logic they mount is tested directly: see tests/router.local.test.ts
        // and tests/upload-router.test.ts.
        "app/api/**",
        // Client singletons built at import: a factory call with no branch.
        "src/lib/uploadthing.ts",
        "src/lib/trpc.ts",
        "src/lib/auth-client.ts",
        "src/lib/trpc-server.ts",
        // Better Auth's configuration object. Instantiating it needs a live
        // database and a provider; what we would assert is that the library
        // read its own options.
        "src/server/auth.ts",
        // Column definitions and their default callbacks. Drizzle runs these,
        // and every table they describe is exercised by the PGlite suites.
        "src/server/schema.ts",
      ],
      /**
       * Set just under what the suite actually reaches, so the number can
       * only go up.
       *
       * A little margin rather than the exact figure: v8 attributes a line or
       * two differently between Node patch releases, and a threshold that
       * fails on that teaches people to raise the threshold. Anything bigger
       * than the margin is a real regression.
       */
      /**
       * Held at 100 on everything a line can be counted for.
       *
       * Reachable because the handful of places that genuinely cannot be
       * exercised — signal handlers that would end the run, chart callbacks a
       * headless DOM never fires, a guard `parseTime` makes unreachable —
       * carry a `v8 ignore` with the reason written at the line. That is the
       * point of the number: not that everything is tested, but that anything
       * untested had to be argued for in the diff.
       *
       * Branches included. The ones that could not be reached — `?? 0` on a
       * count query, a Blob without a `type`, a negated test inside the guard
       * that already ran it — are marked rather than tested, because a test
       * that lies about which values can exist is worse than no test.
       */
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
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
