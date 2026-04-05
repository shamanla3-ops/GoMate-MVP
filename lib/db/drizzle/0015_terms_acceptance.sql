ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted" boolean DEFAULT false NOT NULL;

--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp with time zone;

--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_version" text;
