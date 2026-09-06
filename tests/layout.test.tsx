import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The shell every page is drawn inside.
 *
 * Two decisions live here that are invisible on the page itself: whether the
 * analytics script is on the document at all, and the theme the whole site is
 * painted in.
 */
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans", className: "font-sans" }),
}))
vi.mock("@/index.css", () => ({}))
vi.mock("next/script", () => ({
  default: (props: Record<string, string>) => (
    <script data-testid="analytics" src={props.src} data-domain={props["data-domain"]} />
  ),
}))
vi.mock("./providers", () => ({}))
vi.mock("../app/providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

async function layout() {
  vi.resetModules()
  return (await import("../app/layout")).default
}

beforeEach(() => {
  vi.unstubAllEnvs()
})

describe("RootLayout", () => {
  it("draws what it wraps", async () => {
    vi.stubEnv("NODE_ENV", "test")
    const RootLayout = await layout()
    const { container } = render(<RootLayout>{<p>the app</p>}</RootLayout>)
    expect(container.textContent).toContain("the app")
  })

  it("keeps development traffic out of the dashboard", async () => {
    // A dev server hitting the same site id would put every hot reload in it.
    vi.stubEnv("NODE_ENV", "development")
    const RootLayout = await layout()
    const { queryByTestId } = render(<RootLayout>{<p>x</p>}</RootLayout>)
    expect(queryByTestId("analytics")).toBeNull()
  })

  it("loads the cookieless analytics build in production", async () => {
    // Cookieless on purpose: it costs multi-day journeys, which this site has
    // no use for, and in exchange no consent banner is needed.
    vi.stubEnv("NODE_ENV", "production")
    const RootLayout = await layout()
    const { getByTestId } = render(<RootLayout>{<p>x</p>}</RootLayout>)

    const script = getByTestId("analytics")
    expect(script.getAttribute("src")).toContain("cookieless")
    expect(script.getAttribute("data-domain")).toBe("time2omarchy.com")
  })
})
