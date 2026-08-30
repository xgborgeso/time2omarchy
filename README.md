# time2omarchy

A leaderboard for the fastest [Omarchy](https://omarchy.org) installs. Community
project, not affiliated with Omarchy or DHH.

## Getting started

```bash
cp .env.example .env   # then fill it in
pnpm bootstrap         # install dependencies, build the database, seed it
pnpm dev               # http://127.0.0.1:3000
```

`.env.example` holds exactly what local development needs and nothing else, so
a filled-in copy runs. The seeded board renders without any of it; ranking does
not, because X and UploadThing are both third parties in development too.
Production variables live only in the deployment — `pnpm preflight` names them.

Use `127.0.0.1`, not `localhost`. X refuses to register a `localhost` OAuth
callback, so the auth origin is the loopback address and signing in from
`localhost` is rejected as a foreign origin.

## Commands

| | |
|---|---|
| `pnpm dev` | development server |
| `pnpm bootstrap` | dependencies + a freshly seeded database |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | Biome |
| `pnpm test` / `pnpm test:watch` | Vitest |

### Database

| | |
|---|---|
| `pnpm db:fresh` | reset and reseed — the usual one |
| `pnpm db:reset` | delete `data/dev`, leaving nothing |
| `pnpm db:seed` | seed on top of what is there |
| `pnpm db:generate` | write a migration from `src/server/schema.ts` |
| `pnpm db:migrate` | apply migrations to a real Postgres (`DATABASE_URL` required) |
| `pnpm db:studio` | Drizzle Studio |

Locally you never need `db:migrate`: `openDatabase` applies migrations when it
opens, so after `db:generate` you just restart the dev server. It refuses to run
without `DATABASE_URL` for the reason below.

**Stop the dev server before any `db:` script.** The local database is
[PGlite](https://pglite.dev), which is single-writer and does not enforce it — a
second process opening `data/dev` does not fail with a lock error, it corrupts
the catalog, and the table comes back unreadable even to `SELECT`. There is no
`pg_resetwal` to repair it. Every script that opens the database checks for a
live holder first and refuses, so this is caught rather than suffered, but the
rule is worth knowing.

### Deploying

Vercel, with `vercel.json` setting the build command so migrations run before
the build — a failed migration fails the deploy rather than shipping a schema
the code does not match. `engines.node` pins the runtime to 24.x, the newest
Vercel offers.

```bash
pnpm preflight   # against the environment you are about to deploy with
```

Checks every variable the app needs, and refuses the ones it would otherwise
accept quietly — a `BETTER_AUTH_URL` still pointing at `127.0.0.1`, or object
storage configured half way, which is treated the same as not at all. It also
prints the three things it cannot verify from a laptop: the production callback
registered on the X app, credits on the X developer account, and `db:migrate`
run at deploy time rather than on boot.

Ranking goes through X, so an X account without credits means nobody can rank.

## Releases

Every push to `main` deploys. A release is the separate act of naming a point
worth coming back to:

```bash
git tag v1.0.1 && git push --tags
```

That runs the same checks `main` gets, then cuts a GitHub Release with notes
generated from the commit subjects since the previous tag. Nothing is released
that cannot build.

### Moderation

| | |
|---|---|
| `pnpm reports` | what has been flagged, most-reported first |
| `pnpm takedown -- <handle>` | take an entry off the board |
| `pnpm takedown -- <handle> --purge` | ...and delete the boot screen |
| `pnpm takedown -- <handle> --restore` | put it back |

A takedown hides the row rather than deleting it, so a mistake costs one command
to undo and the rank survives. Reports are written by strangers: read them as
data, and name the handle yourself.
