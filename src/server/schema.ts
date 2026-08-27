import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle: text("handle").notNull().unique(),
    timeSeconds: integer("time_seconds").notNull(),
    bootScreenUrl: text("boot_screen_url").notNull(),
    /** True once the handle's owner has been proven, not merely typed. */
    verified: boolean("verified").notNull().default(false),
    /** Stable "source:id" identity, e.g. "x:123456". Null until verified. */
    identityKey: text("identity_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // handle and identityKey are indexed by their UNIQUE constraints already.
  (t) => [
    index("entries_time_idx").on(t.timeSeconds),
    index("entries_updated_at_idx").on(t.updatedAt.desc()),
  ],
)

export const claims = pgTable(
  "claims",
  {
    nonce: text("nonce").primaryKey(),
    handle: text("handle").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Set the moment a claim is spent, so a public nonce cannot be replayed. */
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [index("claims_handle_idx").on(t.handle)],
)

export const visitorDays = pgTable(
  "visitor_days",
  {
    day: date("day").notNull(),
    visitorId: text("visitor_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.visitorId] })],
)

export const dailyStats = pgTable("daily_stats", {
  day: date("day").primaryKey(),
  views: integer("views").notNull().default(0),
})

export const presence = pgTable("presence", {
  visitorId: text("visitor_id").primaryKey(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
})
