ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "estimated_duration_minutes" integer;

--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "expected_end_time" timestamp with time zone;

--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;

--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "completion_mode" text;

--> statement-breakpoint
UPDATE "trips"
SET "expected_end_time" = "departure_time" + interval '1 hour'
WHERE "expected_end_time" IS NULL;

--> statement-breakpoint
UPDATE "trips"
SET "estimated_duration_minutes" = 60
WHERE "estimated_duration_minutes" IS NULL;

--> statement-breakpoint
ALTER TABLE "user_reviews" ADD COLUMN IF NOT EXISTS "trip_happened" boolean DEFAULT true NOT NULL;

--> statement-breakpoint
ALTER TABLE "user_reviews" ADD COLUMN IF NOT EXISTS "no_show_reason" varchar(64);

--> statement-breakpoint
ALTER TABLE "user_reviews" ALTER COLUMN "rating" DROP NOT NULL;

--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "user_reviews" ADD CONSTRAINT "user_reviews_trip_outcome_chk" CHECK (
    (trip_happened = true AND rating IS NOT NULL AND rating >= 1 AND rating <= 5)
    OR
    (trip_happened = false AND rating IS NULL AND no_show_reason IS NOT NULL)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "review_task_status" AS ENUM ('pending', 'done', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"status" "review_task_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "review_tasks"
    ADD CONSTRAINT "review_tasks_trip_id_trips_id_fk"
    FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "review_tasks"
    ADD CONSTRAINT "review_tasks_reviewer_user_id_users_id_fk"
    FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "review_tasks"
    ADD CONSTRAINT "review_tasks_target_user_id_users_id_fk"
    FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "review_tasks_trip_reviewer_target" ON "review_tasks" ("trip_id","reviewer_user_id","target_user_id");
