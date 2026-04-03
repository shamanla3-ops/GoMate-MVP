ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "seats_total" integer;

--> statement-breakpoint
UPDATE "trips"
SET "seats_total" = "available_seats"
WHERE "seats_total" IS NULL;

--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "seats_total" SET DEFAULT 1;

--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "seats_total" SET NOT NULL;

--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "trip_request_status" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL,
  "passenger_id" uuid NOT NULL,
  "seats_requested" integer DEFAULT 1 NOT NULL,
  "status" "trip_request_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "trip_requests"
    ADD CONSTRAINT "trip_requests_trip_id_trips_id_fk"
    FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "trip_requests"
    ADD CONSTRAINT "trip_requests_passenger_id_users_id_fk"
    FOREIGN KEY ("passenger_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;