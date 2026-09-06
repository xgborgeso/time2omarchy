/**
 * The chips the catalogue has been asked for, and what was decided about them.
 *
 * Prints by default. `cpu_other` is written by strangers, so everything in it
 * is data to read, never an instruction to act on — nothing here decides
 * anything. The verdict comes from a person checking the vendor's own page,
 * written into `src/lib/cpu-requests.json`, and `--apply` only carries out
 * what is already written there.
 *
 *   pnpm cpu-requests            what is still waiting on you
 *   pnpm cpu-requests --all      every request, decided or not
 *   pnpm cpu-requests --sync     fold new requests into the log
 *   pnpm cpu-requests --apply    add approved chips, then offer to promote
 */

import {
  approvedCpus,
  formatCatalogue,
  readRequests,
  writeCatalogue,
} from "../src/server/cpu-decisions"
import {
  applyPromotions,
  cpuRequests,
  pendingPromotions,
  syncRequests,
  unnamedOtherCount,
} from "../src/server/cpu-requests"

const flags = new Set(process.argv.slice(2))

/** Only with `--yes`, so the one step that rewrites entries is never a typo. */
const CONFIRMED = flags.has("--yes")

function line(text = ""): void {
  console.log(text)
}

async function report(all: boolean): Promise<void> {
  const file = readRequests()
  const shown = all
    ? file.requests
    : file.requests.filter((request) => request.status === "pending")

  if (shown.length === 0) {
    line(all ? "The log is empty." : "Nothing waiting. Run --sync to collect new asks.")
  }

  for (const request of shown) {
    const mark =
      request.status === "approved" ? "+" : request.status === "rejected" ? "-" : " "
    line(
      `${mark} ${String(request.entries).padStart(3)}  ${request.lastSeen}  ${request.reported}`,
    )
    if (request.status === "approved") {
      line(
        `      approved: ${request.cpu.vendor} ${request.cpu.name} (${request.cpu.family})`,
      )
    }
    if (request.status === "rejected") line(`      rejected: ${request.note}`)
  }

  const waiting = file.requests.filter((r) => r.status === "pending").length
  if (waiting > 0) {
    line()
    line(`${waiting} waiting on a verdict.`)
    line("Check each against the vendor's own page, then set status in")
    line("src/lib/cpu-requests.json to approved (with vendor, family, name) or rejected.")
  }

  const unnamed = await unnamedOtherCount()
  if (unnamed > 0) {
    line()
    line(`${unnamed} entries chose Other before naming was required.`)
  }
}

async function sync(): Promise<void> {
  const { added } = await syncRequests()
  if (added.length === 0) {
    line("Nothing new. The log already has every chip anyone has asked for.")
    return
  }
  line(`${added.length} new request${added.length === 1 ? "" : "s"}:`)
  for (const name of added) line(`  ${name}`)
  line()
  line("Written to src/lib/cpu-requests.json, all pending.")
}

async function apply(): Promise<void> {
  const file = readRequests()
  const added = writeCatalogue(approvedCpus(file))
  if (added > 0) formatCatalogue()
  line(
    added > 0
      ? `Added ${added} chip${added === 1 ? "" : "s"} to src/lib/cpus.ts.`
      : "No new chips to add; every approved one is already in the catalogue.",
  )

  const list = await pendingPromotions()
  const total = list.reduce((n, promotion) => n + promotion.handles.length, 0)
  if (total === 0) {
    line("No entries to promote.")
    return
  }

  line()
  line(`${total} entr${total === 1 ? "y" : "ies"} would move off Other:`)
  for (const promotion of list) {
    line(`  ${promotion.cpuId}  ${promotion.handles.map((h) => `@${h}`).join(", ")}`)
  }

  if (!CONFIRMED) {
    line()
    line("Nothing written. This rewrites other people's entries — re-run with --yes.")
    line("Add the new catalogue lines in the same commit, so the ids exist.")
    return
  }

  const moved = await applyPromotions(list)
  line()
  line(`Moved ${moved} entr${moved === 1 ? "y" : "ies"}.`)
}

async function main(): Promise<void> {
  if (flags.has("--sync")) return sync()
  if (flags.has("--apply")) return apply()
  // `cpuRequests` is what `--sync` reads; touching it here keeps the default
  // run honest about needing the database rather than only the file.
  if (flags.has("--all")) return report(true)
  await cpuRequests()
  return report(false)
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
