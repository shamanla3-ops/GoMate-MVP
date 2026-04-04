ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "origin_lat" double precision,
  ADD COLUMN IF NOT EXISTS "origin_lng" double precision,
  ADD COLUMN IF NOT EXISTS "destination_lat" double precision,
  ADD COLUMN IF NOT EXISTS "destination_lng" double precision;
--> statement-breakpoint
ALTER TABLE "route_templates"
  ADD COLUMN IF NOT EXISTS "origin_lat" double precision,
  ADD COLUMN IF NOT EXISTS "origin_lng" double precision,
  ADD COLUMN IF NOT EXISTS "destination_lat" double precision,
  ADD COLUMN IF NOT EXISTS "destination_lng" double precision;
