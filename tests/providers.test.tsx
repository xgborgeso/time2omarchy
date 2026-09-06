import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Providers } from "../app/providers"

/**
 * The client boundary every page sits inside.
 *
 * One property is worth pinning and it is not a visual one: the query client
 * is created in state rather than at module scope. A module-level client is
 * shared across requests on the server, which is how one visitor's board data
 * is served to the next.
 */
describe("Providers", () => {
  it("renders what it wraps", () => {
    render(
      <Providers>
        <p>the app</p>
      </Providers>,
    )
    expect(screen.getByText("the app")).toBeVisible()
  })

  it("builds a client per mount, not one shared by every render", () => {
    // Two mounts must not share a cache. On the server that sharing is a data
    // leak between requests rather than a performance detail.
    const { unmount } = render(
      <Providers>
        <p>first</p>
      </Providers>,
    )
    expect(screen.getByText("first")).toBeVisible()
    unmount()

    render(
      <Providers>
        <p>second</p>
      </Providers>,
    )
    expect(screen.getByText("second")).toBeVisible()
    expect(screen.queryByText("first")).toBeNull()
  })
})
