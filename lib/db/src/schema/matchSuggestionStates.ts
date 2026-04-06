import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/** Tracks per-user visibility & notification state for computed match suggestions (stable keys: trip:uuid, …). */
export const matchSuggestionStates = pgTable(
  "match_suggestion_states",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    suggestionKey: text("suggestion_key").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    /** Set when the user was first surfaced an in-app notification for this suggestion (dedupe). */
    inAppNotifiedAt: timestamp("in_app_notified_at", { withTimezone: true }),
    /** Reserved for future push delivery dedupe. */
    pushNotifiedAt: timestamp("push_notified_at", { withTimezone: true }),
    /** Optional payload for future push / analytics (kind, ids). */
    pushPayload: jsonb("push_payload").$type<Record<string, unknown> | null>(),
    /**
     * When the polling layer last delivered this suggestion key to the client (toast/sound dedupe).
     * Separate from seenAt (user viewed Smart Matches).
     */
    pollDeliveredAt: timestamp("poll_delivered_at", { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.suggestionKey] }),
  })
);

export type MatchSuggestionState = typeof matchSuggestionStates.$inferSelect;
export type NewMatchSuggestionState = typeof matchSuggestionStates.$inferInsert;
