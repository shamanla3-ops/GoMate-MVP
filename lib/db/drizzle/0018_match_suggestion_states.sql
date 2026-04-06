CREATE TABLE "match_suggestion_states" (
	"user_id" uuid NOT NULL,
	"suggestion_key" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone,
	"in_app_notified_at" timestamp with time zone,
	"push_notified_at" timestamp with time zone,
	"push_payload" jsonb,
	CONSTRAINT "match_suggestion_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "match_suggestion_states_pkey" PRIMARY KEY("user_id","suggestion_key")
);
--> statement-breakpoint
CREATE INDEX "match_suggestion_states_user_unseen_idx" ON "match_suggestion_states" USING btree ("user_id") WHERE "seen_at" IS NULL;
