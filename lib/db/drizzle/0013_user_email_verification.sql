ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT true;

--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" text;
