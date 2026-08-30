CREATE TABLE "uploads" (
	"key" text PRIMARY KEY NOT NULL,
	"identity_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "uploads_identity_key_idx" ON "uploads" USING btree ("identity_key");