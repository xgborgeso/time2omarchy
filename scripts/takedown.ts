/**
 * Takes an entry off the board, or puts it back.
 *
 *   npm run takedown -- nixgoblin [--purge]
 *   npm run takedown -- nixgoblin --restore
 *
 * The handle is an argument rather than something read out of the reports
 * table on purpose. Report text is written by strangers; letting it choose the
 * target would make the report form a remote control for the leaderboard.
 */
import { normalizeHandle } from "../src/lib/handle"
import { restore, takedown } from "../src/server/takedown"

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const flags = new Set(args.filter((arg) => arg.startsWith("--")))
  const target = args.find((arg) => !arg.startsWith("--"))

  if (!target) {
    console.error("Usage: npm run takedown -- <handle> [--purge] [--restore]")
    process.exit(2)
  }

  const handle = normalizeHandle(target)
  const result = flags.has("--restore")
    ? await restore(handle)
    : await takedown(handle, flags.has("--purge"))

  if (!result.ok) {
    console.error(result.error)
    process.exit(1)
  }

  if (flags.has("--restore")) {
    console.log(`@${result.handle} is back on the board.`)
    return
  }
  console.log(
    `@${result.handle} is off the board.` +
      (result.purged
        ? " The boot screen has been deleted."
        : " The boot screen is still in storage; pass --purge to delete it.") +
      `\nUndo with: npm run takedown -- ${result.handle} --restore`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
