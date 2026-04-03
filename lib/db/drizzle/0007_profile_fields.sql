ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" varchar(50);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "car_brand" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "car_model" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "car_color" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "car_plate_number" varchar(50);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rating" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "co2_saved_kg" integer DEFAULT 0 NOT NULL;