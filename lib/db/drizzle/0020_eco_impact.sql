CREATE TYPE "eco_impact_role" AS ENUM('driver', 'passenger');
--> statement-breakpoint
CREATE TABLE "eco_impact_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "eco_impact_role" NOT NULL,
	"distance_km" double precision NOT NULL,
	"co2_saved_kg" double precision NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_code" varchar(64) NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eco_impact_records" ADD CONSTRAINT "eco_impact_records_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "eco_impact_records" ADD CONSTRAINT "eco_impact_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "eco_impact_trip_user_uidx" ON "eco_impact_records" USING btree ("trip_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_code_uidx" ON "user_badges" USING btree ("user_id","badge_code");
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "distance_km" double precision;
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "eco_total_co2_kg" double precision;
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "eco_awarded_at" timestamp with time zone;
