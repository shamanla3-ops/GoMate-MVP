import { pgTable, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const matchDismissalTargetEnum = pgEnum("match_dismissal_target", [
  "trip",
  "template",
  "preference",
]);

export const matchSuggestionDismissals = pgTable("match_suggestion_dismissals", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  targetType: matchDismissalTargetEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MatchSuggestionDismissal =
  typeof matchSuggestionDismissals.$inferSelect;
export type NewMatchSuggestionDismissal =
  typeof matchSuggestionDismissals.$inferInsert;
