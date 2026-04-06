CREATE TYPE "public"."match_preference_role" AS ENUM('passenger', 'driver', 'both');--> statement-breakpoint
CREATE TYPE "public"."match_dismissal_target" AS ENUM('trip', 'template', 'preference');--> statement-breakpoint
CREATE TABLE "route_match_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "match_preference_role" NOT NULL,
	"origin_text" varchar(255) NOT NULL,
	"destination_text" varchar(255) NOT NULL,
	"preferred_time" varchar(50) NOT NULL,
	"time_flex_minutes" integer,
	"weekdays" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"template_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_suggestion_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" "match_dismissal_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "route_match_preferences" ADD CONSTRAINT "route_match_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_match_preferences" ADD CONSTRAINT "route_match_preferences_template_id_route_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."route_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_suggestion_dismissals" ADD CONSTRAINT "match_suggestion_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "match_dismissal_user_target" ON "match_suggestion_dismissals" USING btree ("user_id","target_type","target_id");
