/**
 * Dev-only seed: sample entries with generated boot-screen images.
 *   pnpm seed          # insert sample rows
 *   pnpm seed --clear  # remove them again
 */
import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { formatTime } from "../src/lib/time"
import { openDatabase } from "../src/server/pglite"

const run = promisify(execFile)

/**
 * Deliberately contains ties, since second-granularity times collide often.
 * 43s and 64s are shared, so the board exercises dense ranking and the
 * oldest-first tie-break rather than only the happy path.
 */
type Specs = [cpuId: string, ramGb: number, storage: string]

const SAMPLE: Array<
  // The fourth element is left over from when entries could be unverified;
  // ranking goes through X now, so every seeded row gets an identity.
  [handle: string, seconds: number, daysAgo: number, unused: boolean, specs: Specs]
> = [
  ["ada", 43, 3, true, ["amd-ryzen-9-9950x", 64, "nvme"]],
  ["kernelpanic", 43, 0.2, false, ["intel-core-i9-14900k", 32, "nvme"]],
  ["bob", 51, 1, true, ["amd-ryzen-7-7800x3d", 32, "nvme"]],
  ["nixgoblin", 64, 2, false, ["amd-ryzen-5-5600x", 16, "ssd"]],
  ["hyprfan", 64, 0.008, false, ["apple-m4-pro", 24, "nvme"]],
  ["archbtw", 64, 4, true, ["intel-core-i7-13700k", 32, "nvme"]],
  ["ricermaxx", 135, 6, false, ["other", 16, "hdd"]],
  ["slowboot", 187, 0.125, true, ["intel-core-i7-1260p", 8, "hdd"]],
]

type Entry = (typeof SAMPLE)[number]

/**
 * Enough entries to see the board as it will actually look.
 *
 * Fifty fits on a page, so a hundred and twenty gives three pages, a tail deep
 * enough that the handle lookup is the only way to reach it, and a spread of
 * times wide enough for the distribution chart to have a shape.
 */
const FILLER = 112

const FIRST = [
  "void",
  "tux",
  "hypr",
  "arch",
  "kernel",
  "sudo",
  "grub",
  "wayland",
  "nix",
  "zsh",
  "ryzen",
  "silicon",
  "quantum",
  "neon",
  "static",
  "async",
  "raw",
  "cold",
  "fast",
  "lean",
]
const SECOND = [
  "smith",
  "racer",
  "pilot",
  "wizard",
  "goblin",
  "hermit",
  "runner",
  "monk",
  "hacker",
  "witch",
  "nomad",
  "surfer",
  "ghost",
  "punk",
  "bard",
  "scout",
  "ranger",
  "druid",
]

const CPUS: Specs[] = [
  ["amd-ryzen-7-9800x3d", 32, "nvme"],
  ["amd-ryzen-9-9950x", 64, "nvme"],
  ["intel-core-ultra-7-265k", 32, "nvme"],
  ["apple-m4-pro", 24, "nvme"],
  ["amd-ryzen-5-7600x", 16, "nvme"],
  ["intel-core-i5-12600k", 16, "ssd"],
  ["amd-ryzen-7-5800x", 32, "ssd"],
  ["intel-core-i7-1260p", 16, "ssd"],
  ["other", 8, "hdd"],
]

/**
 * A fixed sequence, so reseeding produces the same board.
 *
 * `Math.random` would reshuffle the leaderboard on every seed, which makes any
 * visual change impossible to judge against the last one.
 */
function sequence(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
}

function filler(): Entry[] {
  const next = sequence(20_260_828)
  const used = new Set(SAMPLE.map(([handle]) => handle))
  const entries: Entry[] = []

  while (entries.length < FILLER) {
    const handle = `${FIRST[Math.floor(next() * FIRST.length)]}${SECOND[Math.floor(next() * SECOND.length)]}${entries.length % 3 === 0 ? Math.floor(next() * 90 + 10) : ""}`
    if (used.has(handle)) continue
    used.add(handle)

    const specs = CPUS[Math.floor(next() * CPUS.length)] as Specs
    const [cpuId, ramGb, storage] = specs

    /**
     * The time follows the hardware, because the benchmark page reads it back.
     *
     * Drawing a time and a machine independently produced a board where SATA
     * SSDs beat NVMe — which makes the hardware tables look broken rather than
     * making the fake data look fake. The drive dominates, the chip adjusts,
     * and eight gigabytes of memory hurts; a little noise keeps the ties real.
     */
    const base = storage === "nvme" ? 34 : storage === "ssd" ? 62 : 210
    const chip = cpuId === "other" ? 1.35 : cpuId.startsWith("intel") ? 1.12 : 1
    const memory = ramGb <= 8 ? 1.4 : ramGb <= 16 ? 1.08 : 1
    const spread = 0.75 + next() * 0.6
    const seconds = Math.max(15, Math.round(base * chip * memory * spread))

    entries.push([
      handle,
      seconds,
      Number((next() * 9).toFixed(3)),
      // Roughly a third proven, so both badge states are on screen at once.
      next() < 0.34,
      specs,
    ])
  }
  return entries
}

const ENTRIES: Entry[] = [...SAMPLE, ...filler()]

const UPLOADS = path.resolve("public/uploads")

const MONO = "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf"

/**
 * Approximates the Omarchy installer's success screen, using the real logo.
 *
 * One image per distinct time rather than per entry: a hundred and twenty
 * ImageMagick invocations take minutes, and every entry with the same time
 * would produce an identical picture anyway.
 */
const screens = new Map<number, Promise<string>>()

function bootScreenFor(seconds: number): Promise<string> {
  const existing = screens.get(seconds)
  if (existing) return existing
  const made = bootScreen(`t${seconds}`, seconds)
  screens.set(seconds, made)
  return made
}

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
// Migrations run on open, so seeding works against a brand-new ./data/dev
// without starting the app first.
const { client: db } = await openDatabase("./data/dev")

if (clear) {
  const handles = ENTRIES.map(([h]) => h)
  const res = await db.query<{ handle: string }>(
    "DELETE FROM entries WHERE handle = ANY($1) RETURNING handle",
    [handles],
  )
  console.log(`removed ${res.rows.length} seeded entries`)
} else {
  await mkdir(UPLOADS, { recursive: true })
  // The `verified` element of each tuple is ignored now that ranking goes
  // through X — every seeded row gets an identity, because every real one has.
  for (const [handle, seconds, daysAgo, , [cpuId, ramGb, storage]] of ENTRIES) {
    const url = await bootScreenFor(seconds)
    const at = new Date(Date.now() - daysAgo * 86_400_000)
    await db.query(
      `INSERT INTO entries
         (id, handle, time_seconds, boot_screen_url, identity_key,
          cpu_id, ram_gb, storage, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (handle) DO UPDATE
         SET time_seconds = EXCLUDED.time_seconds,
             boot_screen_url = EXCLUDED.boot_screen_url,
             identity_key = EXCLUDED.identity_key,
             cpu_id = EXCLUDED.cpu_id,
             ram_gb = EXCLUDED.ram_gb,
             storage = EXCLUDED.storage,
             updated_at = EXCLUDED.updated_at`,
      [crypto.randomUUID(), handle, seconds, url, `x:${handle}`, cpuId, ramGb, storage, at],
    )
  }
  console.log(`seeded ${ENTRIES.length} entries`)
}

await db.close()
