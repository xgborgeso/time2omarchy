--> Ranking now goes through X, so an entry without an account behind it is not
--> a thing this board can represent. Any row still holding a null identity was
--> ranked as a guest under the old rules and cannot be adopted by anyone, so it
--> goes before the column is tightened — otherwise SET NOT NULL fails outright
--> and the deploy stops halfway.
DELETE FROM "entries" WHERE "identity_key" IS NULL;--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "identity_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "verified";
