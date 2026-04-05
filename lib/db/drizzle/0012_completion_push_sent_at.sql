ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "completion_push_sent_at" timestamp with time zone;

--> statement-breakpoint
UPDATE "trips"
SET "completion_push_sent_at" = COALESCE("completion_push_sent_at", now())
WHERE "status" = 'completed';
