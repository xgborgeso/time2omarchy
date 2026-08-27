/**
 * Dev-only seed: sample entries with generated boot-screen images.
 *   pnpm seed          # insert sample rows
 *   pnpm seed --clear  # remove them again
 */
import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { PGlite } from "@electric-sql/pglite"
import { formatTime } from "../src/lib/time"

const run = promisify(execFile)

/**
 * Deliberately contains ties, since second-granularity times collide often.
 * 43s and 64s are shared, so the board exercises competition ranking and the
 * verified-listed-first order rather than only the happy path.
 */
const SAMPLE: Array<[handle: string, seconds: number, daysAgo: number, verified: boolean]> =
  [
    ["ada", 43, 3, true],
    ["kernelpanic", 43, 0.2, false],
    ["bob", 51, 1, true],
    ["nixgoblin", 64, 2, false],
    ["hyprfan", 64, 0.008, false],
    ["archbtw", 64, 4, true],
    ["ricermaxx", 135, 6, false],
    ["slowboot", 187, 0.125, true],
  ]

const UPLOADS = path.resolve("public/uploads")

const MONO = "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf"

/** Approximates the Omarchy installer's success screen, using the real logo. */
async function bootScreen(handle: string, seconds: number): Promise<string> {
  const file = `${handle}-seed.png`
  const logo = path.join(UPLOADS, ".logo-green.svg")
  await writeFile(
    logo,
    (await readFile("/usr/share/omarchy/logo.svg", "utf8")).replace(
      'fill="#000"',
      'fill="#9ece6a"',
    ),
  )
  await run("magick", [
    "-size",
    "800x600",
    "xc:#1a1b26",
    "(",
    logo,
    "-resize",
    "560x",
    ")",
    "-gravity",
    "center",
    "-geometry",
    "+0-70",
    "-composite",
    "-font",
    MONO,
    "-pointsize",
    "23",
    "-fill",
    "#c0caf5",
    "-gravity",
    "center",
    "-annotate",
    "+0+60",
    `Installed Omarchy in ${formatTime(seconds)}`,
    "-fill",
    "#9ece6a",
    "-draw",
    "rectangle 335,395 465,432",
    "-fill",
    "#1a1b26",
    "-pointsize",
    "19",
    "-annotate",
    "+0+128",
    "Reboot Now",
    path.join(UPLOADS, file),
  ])
  return `/uploads/${file}`
}

const clear = process.argv.includes("--clear")
const db = new PGlite("./data/dev")
await db.waitReady
// The schema is normally applied by the server on boot. Apply it here too so
// seeding works against a brand-new ./data/dev without starting the app first.
await db.exec(await readFile("drizzle/0000_init.sql", "utf8"))

if (clear) {
  const handles = SAMPLE.map(([h]) => h)
  const res = await db.query<{ handle: string }>(
    "DELETE FROM entries WHERE handle = ANY($1) RETURNING handle",
    [handles],
  )
  console.log(`removed ${res.rows.length} seeded entries`)
} else {
  await mkdir(UPLOADS, { recursive: true })
  for (const [handle, seconds, daysAgo, verified] of SAMPLE) {
    const url = await bootScreen(handle, seconds)
    const at = new Date(Date.now() - daysAgo * 86_400_000)
    await db.query(
      `INSERT INTO entries
         (id, handle, time_seconds, boot_screen_url, verified, identity_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (handle) DO UPDATE
         SET time_seconds = EXCLUDED.time_seconds,
             boot_screen_url = EXCLUDED.boot_screen_url,
             verified = EXCLUDED.verified,
             identity_key = EXCLUDED.identity_key,
             updated_at = EXCLUDED.updated_at`,
      [
        crypto.randomUUID(),
        handle,
        seconds,
        url,
        verified,
        verified ? `x:${handle}` : null,
        at,
      ],
    )
  }
  console.log(`seeded ${SAMPLE.length} entries`)
}

await db.close()
