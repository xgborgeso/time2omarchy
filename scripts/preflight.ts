/**
 * What a deployment needs, checked before it is one.
 *
 * Every rule here corresponds to something the app refuses at runtime, or —
 * worse — something it accepts and quietly stops protecting. The point is to
 * fail on a laptop rather than at three in the morning on launch day.
 *
 * Run against the environment you are about to deploy with:
 *   DATABASE_URL=... BETTER_AUTH_URL=... pnpm preflight
 */

type Check = {
  label: string
  /** Null when satisfied, otherwise what is wrong. */
  problem: () => string | null
  /** A warning is worth saying; only a failure stops a deploy. */
  fatal: boolean
}

function value(name: string): string {
  return process.env[name]?.trim() ?? ""
}

function required(name: string, why: string): Check {
  return {
    label: name,
    problem: () => (value(name) ? null : why),
    fatal: true,
  }
}

/** Both, or neither: a token with no host cannot produce a usable url. */
const OBJECT_STORE = ["UPLOADTHING_TOKEN", "PUBLIC_UPLOAD_BASE"]

const checks: Check[] = [
  required(
    "DATABASE_URL",
    "Postgres is required. Without it a deployed instance would open the local " +
      "PGlite file, whose disk is ephemeral and unshared — the board would reset " +
      "on every restart and disagree between instances.",
  ),
  required("BETTER_AUTH_SECRET", "Sessions cannot be signed without it."),
  required("TWITTER_CLIENT_ID", "Ranking goes through X; without this nobody can rank."),
  required(
    "TWITTER_CLIENT_SECRET",
    "Ranking goes through X; without this nobody can rank.",
  ),
  {
    label: "BETTER_AUTH_URL",
    fatal: true,
    problem: () => {
      const url = value("BETTER_AUTH_URL")
      if (!url) return "Required: it is the origin X redirects back to."
      if (/localhost|127\.0\.0\.1/.test(url)) {
        return (
          `Still points at the dev origin (${url}). Every sign-in would be ` +
          "refused as a foreign origin. Set it to the deployed https:// origin."
        )
      }
      if (!url.startsWith("https://")) {
        return `Not https (${url}). X refuses a plaintext callback in production.`
      }
      return null
    },
  },
  {
    label: "Boot screen storage",
    fatal: true,
    problem: () => {
      const missing = OBJECT_STORE.filter((name) => !value(name))
      if (missing.length === 0) return null
      if (missing.length === OBJECT_STORE.length) {
        return (
          "Not configured, so nobody can upload a boot screen and nobody can " +
          `rank. Both are required: ${OBJECT_STORE.join(", ")}`
        )
      }
      return `Half-configured, which is refused the same as none. Missing: ${missing.join(", ")}`
    },
  },
  {
    label: "TRUSTED_IP_HEADER",
    // Not fatal: the app runs. It simply stops defending itself, and nothing
    // in the logs will ever say so.
    fatal: false,
    problem: () =>
      value("TRUSTED_IP_HEADER")
        ? null
        : "Unset, so every caller shares one rate-limit bucket — one person can " +
          "exhaust the upload and report limits for everyone. Use x-forwarded-for " +
          "on Vercel, or cf-connecting-ip behind Cloudflare.",
  },
  {
    label: "Better Stack",
    // Not fatal: the app runs and logs to the platform. It just means nobody
    // is told, and the failure this exists for is a silent one.
    fatal: false,
    problem: () =>
      value("BETTERSTACK_SOURCE_TOKEN") && value("BETTERSTACK_INGEST_HOST")
        ? null
        : "Unset, so server errors reach the platform log and nothing else. " +
          "The X account running out of credits stops every rank and is " +
          "invisible without this. Needs BETTERSTACK_SOURCE_TOKEN and " +
          "BETTERSTACK_INGEST_HOST.",
  },
  {
    label: "NEXT_PUBLIC_ANALYTICS_URL",
    fatal: false,
    problem: () =>
      value("NEXT_PUBLIC_ANALYTICS_URL")
        ? null
        : "Unset, so the Analytics page shows this app's own figures and no link " +
          "out to the hosted dashboard. Optional.",
  },
]

const failures: Check[] = []
const warnings: Check[] = []

for (const check of checks) {
  const problem = check.problem()
  if (!problem) {
    console.log(`  ✓ ${check.label}`)
    continue
  }
  ;(check.fatal ? failures : warnings).push(check)
  console.log(`  ${check.fatal ? "✗" : "!"} ${check.label}\n      ${problem}`)
}

console.log("")

// Reminders rather than checks: nothing readable from here can prove any of
// them, and a preflight that only lists what it can verify is misleading about
// what a deploy needs.
if (failures.length === 0) {
  console.log("  Not checkable from here, and still required:")
  console.log(
    "    · https://<your-domain>/api/auth/callback/twitter registered on the X app",
  )
  console.log("    · credits on the X developer account — no credits, nobody can rank")
  console.log("    · pnpm db:migrate run at deploy time, never on boot")
  console.log("")
}

if (failures.length > 0) {
  console.error(
    `✗ ${failures.length} ${failures.length === 1 ? "problem" : "problems"} to fix before deploying.\n`,
  )
  process.exit(1)
}

console.log(
  warnings.length > 0
    ? `✓ Ready to deploy, with ${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"} above.\n`
    : "✓ Ready to deploy.\n",
)
