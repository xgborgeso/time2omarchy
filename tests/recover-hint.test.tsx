import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RecoverHint } from "@/components/RecoverHint"
import { RECOVER_COMMAND } from "@/lib/recover"

/**
 * `navigator.clipboard` is a getter with no setter, so it is replaced by
 * stubbing the getter rather than assigning through it.
 */
function clipboard(writeText: () => Promise<void>) {
  vi.spyOn(navigator, "clipboard", "get").mockReturnValue({
    writeText,
  } as unknown as Clipboard)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("RecoverHint", () => {
  it("costs nothing to anyone who already has their photo", async () => {
    // Closed by default. Most people arriving at the form snapped the screen
    // and do not need any of this; it must not push their fields down.
    render(<RecoverHint label="Didn't snap it?" />)
    expect(screen.queryByText(RECOVER_COMMAND)).toBeNull()
    expect(screen.getByRole("button", { name: /didn't snap it/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("shows the whole path once opened, not just the command", async () => {
    // A command with no worked example leaves you unsure whether it ran
    // correctly. The output and where its number goes are part of the answer.
    const user = userEvent.setup()
    render(<RecoverHint label="Didn't snap it?" />)
    await user.click(screen.getByRole("button", { name: /didn't snap it/i }))

    expect(screen.getByText(RECOVER_COMMAND)).toBeVisible()
    expect(screen.getByText(/omarchy install time: 99s/)).toBeVisible()
    expect(screen.getByText(/seconds go in the time field/i)).toBeVisible()
  })

  it("says to screenshot the terminal, which is the step people skip", async () => {
    // Recovering the number is useless on its own: the form still wants an
    // image. Someone who runs the command and stops has done half the job.
    const user = userEvent.setup()
    render(<RecoverHint label="Recover it" />)
    await user.click(screen.getByRole("button", { name: /recover it/i }))
    expect(screen.getByText(/screenshot your terminal/i)).toBeVisible()
  })

  it("closes again, so it is a disclosure rather than a one-way door", async () => {
    const user = userEvent.setup()
    render(<RecoverHint label="Recover it" />)
    const trigger = screen.getByRole("button", { name: /recover it/i })

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(RECOVER_COMMAND)).toBeNull()
  })

  it("copies the command rather than the surrounding prose", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    // After setup, never before: userEvent installs a clipboard stub of its
    // own and would replace this one.
    const user = userEvent.setup()
    clipboard(writeText)
    render(<RecoverHint label="Recover it" />)
    await user.click(screen.getByRole("button", { name: /recover it/i }))
    await user.click(screen.getByRole("button", { name: /copy/i }))

    expect(writeText).toHaveBeenCalledWith(RECOVER_COMMAND)
    expect(await screen.findByText(/copied/i)).toBeVisible()
  })

  it("survives a clipboard that refuses, because plain http has none", async () => {
    // Refused permission and insecure origins both throw. Neither is something
    // the reader can act on, and the command is selectable text regardless.
    const user = userEvent.setup()
    clipboard(vi.fn().mockRejectedValue(new Error("denied")))
    render(<RecoverHint label="Recover it" />)
    await user.click(screen.getByRole("button", { name: /recover it/i }))
    await user.click(screen.getByRole("button", { name: /copy/i }))

    // Still open, still showing the command to select by hand — and honest
    // about it, rather than claiming a copy that did not happen.
    expect(screen.getByText(RECOVER_COMMAND)).toBeVisible()
    expect(screen.queryByText(/copied/i)).toBeNull()
  })
})
