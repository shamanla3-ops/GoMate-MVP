ALTER TABLE "match_suggestion_states" ADD COLUMN "poll_delivered_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "match_suggestion_states" SET "poll_delivered_at" = NOW() WHERE "poll_delivered_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "match_suggestion_states_user_poll_pending_idx" ON "match_suggestion_states" USING btree ("user_id") WHERE "seen_at" IS NULL AND "poll_delivered_at" IS NULL AND "in_app_notified_at" IS NOT NULL;
