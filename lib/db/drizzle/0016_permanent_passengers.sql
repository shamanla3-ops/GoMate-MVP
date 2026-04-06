CREATE TYPE "public"."permanent_passenger_request_direction" AS ENUM('request', 'invitation');--> statement-breakpoint
CREATE TYPE "public"."permanent_passenger_request_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."permanent_passenger_relationship_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "permanent_passenger_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"passenger_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"direction" "permanent_passenger_request_direction" NOT NULL,
	"template_id" uuid,
	"trip_id" uuid,
	"origin_text" varchar(255),
	"destination_text" varchar(255),
	"preferred_time" varchar(50),
	"weekdays" text[] NOT NULL,
	"note" text,
	"pattern_key" text NOT NULL,
	"status" "permanent_passenger_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permanent_passenger_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"passenger_id" uuid NOT NULL,
	"source_request_id" uuid,
	"template_id" uuid,
	"preferred_time" varchar(50),
	"weekdays" text[] NOT NULL,
	"pattern_key" text NOT NULL,
	"origin_text" varchar(255),
	"destination_text" varchar(255),
	"status" "permanent_passenger_relationship_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permanent_passenger_skips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"skip_date" date NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permanent_passenger_requests" ADD CONSTRAINT "permanent_passenger_requests_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_requests" ADD CONSTRAINT "permanent_passenger_requests_passenger_id_users_id_fk" FOREIGN KEY ("passenger_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_requests" ADD CONSTRAINT "permanent_passenger_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_requests" ADD CONSTRAINT "permanent_passenger_requests_template_id_route_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."route_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_requests" ADD CONSTRAINT "permanent_passenger_requests_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_relationships" ADD CONSTRAINT "permanent_passenger_relationships_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_relationships" ADD CONSTRAINT "permanent_passenger_relationships_passenger_id_users_id_fk" FOREIGN KEY ("passenger_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_relationships" ADD CONSTRAINT "permanent_passenger_relationships_source_request_id_permanent_passenger_requests_id_fk" FOREIGN KEY ("source_request_id") REFERENCES "public"."permanent_passenger_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_relationships" ADD CONSTRAINT "permanent_passenger_relationships_template_id_route_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."route_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_skips" ADD CONSTRAINT "permanent_passenger_skips_relationship_id_permanent_passenger_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."permanent_passenger_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permanent_passenger_skips" ADD CONSTRAINT "permanent_passenger_skips_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "permanent_passenger_requests_pending_pattern_key" ON "permanent_passenger_requests" USING btree ("pattern_key") WHERE "permanent_passenger_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "permanent_passenger_relationships_active_pattern_key" ON "permanent_passenger_relationships" USING btree ("pattern_key") WHERE "permanent_passenger_relationships"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "permanent_passenger_skips_relationship_date" ON "permanent_passenger_skips" USING btree ("relationship_id","skip_date");
