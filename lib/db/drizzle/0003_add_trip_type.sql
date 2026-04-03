CREATE TYPE "public"."trip_type" AS ENUM('one-time', 'regular');--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "trip_type" "trip_type" DEFAULT 'one-time' NOT NULL;
