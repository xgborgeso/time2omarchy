CREATE TABLE "claims" (
	"nonce" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"day" date PRIMARY KEY NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"time_seconds" integer NOT NULL,
	"boot_screen_url" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"identity_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_handle_unique" UNIQUE("handle"),
	CONSTRAINT "entries_identity_key_unique" UNIQUE("identity_key")
);
--> statement-breakpoint
CREATE TABLE "presence" (
	"visitor_id" text PRIMARY KEY NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_days" (
	"day" date NOT NULL,
	"visitor_id" text NOT NULL,
	CONSTRAINT "visitor_days_day_visitor_id_pk" PRIMARY KEY("day","visitor_id")
);
--> statement-breakpoint
CREATE INDEX "claims_handle_idx" ON "claims" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "entries_time_idx" ON "entries" USING btree ("time_seconds");--> statement-breakpoint
CREATE INDEX "entries_updated_at_idx" ON "entries" USING btree ("updated_at" DESC NULLS LAST);