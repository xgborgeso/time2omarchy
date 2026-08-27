-- The whole schema. The server replays this file on every boot (see
-- `applyInitSql` in src/server/db.ts), so every statement is written to be
-- safely repeatable. There is no migration journal and no second file: until
-- release, this is edited in place rather than added to.

CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text UNIQUE NOT NULL,
  time_seconds integer NOT NULL,
  boot_screen_url text NOT NULL,
  -- True once the handle's owner has been proven, not merely typed.
  verified boolean NOT NULL DEFAULT false,
  -- Stable "source:id" identity, e.g. "x:123456". Null until verified, and
  -- Postgres allows many nulls under UNIQUE, so unverified rows coexist.
  identity_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inline UNIQUE lets Postgres name these (entries_handle_key), which differs
-- from drizzle-kit's convention (entries_handle_unique). Functionally identical.
-- This file is the source of truth, so do not "fix" it with drizzle-kit push.
-- `handle` and `identity_key` are already indexed by their UNIQUE constraints;
-- indexing them again would just double the write cost. These two are the
-- access paths that nothing else covers.
CREATE INDEX IF NOT EXISTS entries_time_idx ON entries (time_seconds ASC);
-- The activity feed and the daily trend both read the newest rows first, on
-- every board poll.
CREATE INDEX IF NOT EXISTS entries_updated_at_idx ON entries (updated_at DESC);

-- A handle claim awaiting proof. The nonce goes in a public post, so it must
-- be server-issued, single-use and short-lived: anyone can read a public nonce
-- and replay it, and without those three properties replaying it would hand
-- them write access to someone else's row.
CREATE TABLE IF NOT EXISTS claims (
  nonce text PRIMARY KEY,
  handle text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS claims_handle_idx ON claims (handle);

CREATE TABLE IF NOT EXISTS visitor_days (
  day date NOT NULL,
  visitor_id text NOT NULL,
  PRIMARY KEY (day, visitor_id)
);

CREATE TABLE IF NOT EXISTS daily_stats (
  day date PRIMARY KEY,
  views integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS presence (
  visitor_id text PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now()
);
