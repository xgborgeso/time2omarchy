# time2omarchy

[![Check](https://github.com/xgborgeso/time2omarchy/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/xgborgeso/time2omarchy/actions/workflows/check.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](vitest.config.ts)

A leaderboard for the fastest [Omarchy](https://omarchy.org) installs. Community
project, not affiliated with Omarchy or DHH.

**[time2omarchy.com](https://time2omarchy.com)**

![The board](public/og.png)

## How it works

Install Omarchy, photograph the boot screen with your time on it, and post it.
Ranking goes through X, so the handle on an entry is the one X answered with and
there is nothing to impersonate. The boot screen is the only check on a time, and
anyone can flag one.

The photo is redrawn in the browser before it is uploaded, which strips the EXIF
a phone attaches and turns four megabytes into a few hundred kilobytes.

## Running it locally

```bash
cp .env.example .env   # then fill it in
pnpm bootstrap         # dependencies, database, seed data
pnpm dev               # http://127.0.0.1:3000
```

The seeded board renders with an empty `.env` — a hundred and twenty entries, and
the stats and rules pages work. Only *ranking* needs credentials, because it goes
through X and UploadThing, and both are third parties in development too.

Use `127.0.0.1`, not `localhost`. X refuses to register a `localhost` OAuth
callback, and cookies are per-host, so a session started on one is not sent to
the other.

## Commands

| | |
|---|---|
| `pnpm dev` | development server |
| `pnpm bootstrap` | dependencies + a freshly seeded database |
| `pnpm test` | Vitest |
| `pnpm test:coverage` | Vitest with coverage, held at 100% |
| `pnpm cpu-requests` | chips people asked for, and what was decided |
| `pnpm lint` | Biome |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:fresh` | reset and reseed — the usual one |
| `pnpm db:generate` | write a migration from `src/server/schema.ts` |

Postgres runs locally through PGlite, so there is no database to install.

The badge above is a fixed number rather than a stale one: coverage thresholds
sit at 100 in `vitest.config.ts` and CI runs `pnpm test:coverage`, so a drop
fails the build instead of quietly rewriting the badge. The handful of lines
that genuinely cannot be executed — a signal handler that would end the test
run, a chart callback a headless DOM never fires, a `?? 0` on a query that
always returns a row — carry a `v8 ignore` with the reason written beside them,
so anything uncovered had to be argued for in the diff.

## Contributing

Issues and pull requests welcome. Run `pnpm test && pnpm lint && pnpm typecheck`
before opening one; CI runs the same three and production waits for them.

A missing CPU needs no issue and no pull request. Choose **Other** on the rank
form and name the chip: `pnpm cpu-requests` collects what people asked for into
[`src/lib/cpu-requests.json`](src/lib/cpu-requests.json), each one is checked by
hand against the vendor's own page, and `--apply` adds the ones that are real.

The [Catalogue workflow](.github/workflows/catalogue.yml) does the collecting
weekly and opens a pull request when there is something new. It reads the
board, so it wants a `DATABASE_URL_READONLY` secret holding a **read-only**
role — a scheduled job nobody is watching should not be able to write. It is a
CI secret rather than a deploy one, so it is not in `.env.example` and
`preflight` does not ask for it; the workflow refuses to start without it and
says so.

## Stack

Next.js, tRPC, Drizzle, Better Auth, UploadThing, and Postgres on Neon, deployed
on Vercel.

[MIT](LICENSE)
