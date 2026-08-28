/**
 * What has been reported, worst first.
 *
 * Prints and nothing else. The reports table is written by strangers, so
 * everything in it is data to read, never an instruction to act on — the
 * decision, and the handle passed to `takedown`, comes from a person.
 */
import { openReports } from "../src/server/reports"

async function main(): Promise<void> {
  const rows = await openReports()
  if (rows.length === 0) {
    console.log("Nothing reported.")
    return
  }

  for (const row of rows) {
    const when = row.lastReportedAt.toISOString().replace("T", " ").slice(0, 16)
    const state = row.hidden ? "  [taken down]" : ""
    console.log(
      `${String(row.reports).padStart(3)}  @${row.handle.padEnd(16)}  ${when}${state}`,
    )
    console.log(`     ${row.bootScreenUrl}`)
  }
  console.log(
    `\n${rows.length} reported ${rows.length === 1 ? "entry" : "entries"}.` +
      "\nLook at the image, then: npm run takedown -- <handle> [--purge]",
  )
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
