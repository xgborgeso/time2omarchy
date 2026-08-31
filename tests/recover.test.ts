import { describe, expect, it } from "vitest"
import { RECOVER_COMMAND, RECOVER_EXAMPLE, TIMING_LOG } from "@/lib/recover"
import { parseTime } from "@/lib/time"

describe("the recovery command", () => {
  it("reads the log the rules name, from the one constant", () => {
    // The rules print this path in prose and the command reads it. Two copies
    // would drift, and the drift would send people to a file that is not there.
    expect(RECOVER_COMMAND).toContain(TIMING_LOG)
    expect(TIMING_LOG).toBe("/var/log/omarchy-install-timing.json")
  })

  it("needs no sudo, because the file does not need one", () => {
    // Mode 0644. An instruction to sudo would be both wrong and alarming —
    // this is a command strangers paste into their own shell.
    expect(RECOVER_COMMAND).not.toMatch(/sudo|doas/)
  })

  it("uses only jq, which every Omarchy box is guaranteed to have", () => {
    // jq is in omarchy-base.packages and lists omarchy in Required By. python,
    // bc and friends are not that, and a command that needs an install first
    // is not a command anybody runs.
    expect(RECOVER_COMMAND.startsWith("jq ")).toBe(true)
    expect(RECOVER_COMMAND).not.toMatch(/python|bc\b|node|awk|perl/)
  })

  it("subtracts the installer's own two timestamps", () => {
    // Not phase_started_at, which is when the *last* phase began — using it
    // would report a fraction of a second for every install.
    expect(RECOVER_COMMAND).toContain(".finished_at")
    expect(RECOVER_COMMAND).toContain(".started_at")
    expect(RECOVER_COMMAND).not.toContain(".phase_started_at")
  })

  it("rounds, so it agrees with the time the board would have shown", () => {
    // formatTime rounds. Flooring here would put an entry a second under what
    // the boot screen said, on half of all installs.
    expect(RECOVER_COMMAND).toContain("round")
    expect(RECOVER_COMMAND).not.toContain("floor")
  })

  it("labels its output, because the output is what gets uploaded", () => {
    // A screenshot of a bare "99" proves nothing and says nothing. This one
    // survives being cropped.
    expect(RECOVER_EXAMPLE).toMatch(/^omarchy install time: /)
    expect(RECOVER_COMMAND).toContain("omarchy install time:")
  })

  it("prints a time the form already knows how to read", () => {
    // The whole point is that you type what you see. If the form rejected the
    // command's own output, the path would dead-end at the last step.
    const printed = RECOVER_EXAMPLE.replace("omarchy install time: ", "")
    expect(parseTime(printed)).toBe(99)
  })

  it("stays short enough to sit in a copy box", () => {
    // It is shown in full rather than truncated, so length is a design
    // constraint and not a detail.
    expect(RECOVER_COMMAND.length).toBeLessThan(140)
  })
})
