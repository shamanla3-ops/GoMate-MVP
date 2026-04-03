CREATE TABLE IF NOT EXISTS "route_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"origin" varchar(255) NOT NULL,
	"destination" varchar(255) NOT NULL,
	"default_departure_time" varchar(50),
	"available_seats" integer NOT NULL,
	"price" integer NOT NULL,
	"currency" "trip_currency" DEFAULT 'EUR' NOT NULL,
	"trip_type" "trip_type" DEFAULT 'one-time' NOT NULL,
	"weekdays" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "route_templates" ADD CONSTRAINT "route_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
