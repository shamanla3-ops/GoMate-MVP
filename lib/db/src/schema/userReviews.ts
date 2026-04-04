import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  uniqueIndex,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { trips } from "./trips.js";
import { users } from "./users.js";

export const userReviews = pgTable(
  "user_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),

    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** When trip did not happen, null; otherwise 1–5 */
    rating: integer("rating"),

    comment: text("comment"),

    tripHappened: boolean("trip_happened").notNull().default(true),

    /** When trip_happened is false: driver_no_show | passenger_no_show | trip_cancelled | other */
    noShowReason: varchar("no_show_reason", { length: 64 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqTripAuthorReviewee: uniqueIndex("user_reviews_trip_author_reviewee").on(
      table.tripId,
      table.authorId,
      table.revieweeId
    ),
  })
);

export type UserReview = typeof userReviews.$inferSelect;
export type NewUserReview = typeof userReviews.$inferInsert;
