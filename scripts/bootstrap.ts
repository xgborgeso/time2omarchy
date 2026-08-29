/**
 * A working development environment, from a clean checkout or a dirty one.
 *
 * Deliberately stops short of starting the dev server: a setup step that never
 * exits cannot be composed, cannot run in CI, and makes Ctrl+C ambiguous.
 *
 * Named `bootstrap` rather than `setup` because `pnpm setup` is pnpm's own
 * command — it configures pnpm's global bin directory, and would shadow this
 * one for anybody typing the obvious thing.
 */
import { spawnSync } from "node:child_process"

function run(label: string, command: string, args: string[]): void {
  // No `shell: true`: node deprecated passing args alongside it, and pnpm puts
  // node_modules/.bin on PATH for scripts, so there is nothing a shell adds.
  const result = spawnSync(command, args, { stdio: "inherit" })
  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed.`)
    process.exit(result.status ?? 1)
  }
  console.log(`  ✓ ${label}`)
}

run("dependencies installed", "pnpm", ["install"])
run("database rebuilt", "pnpm", ["db:fresh"])

console.log("\n  Now run: pnpm dev\n")
