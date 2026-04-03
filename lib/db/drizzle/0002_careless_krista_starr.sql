CREATE TYPE "public"."trip_currency" AS ENUM('EUR', 'USD', 'PLN');--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "currency" "trip_currency" DEFAULT 'EUR' NOT NULL;