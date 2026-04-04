import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  uniqueIndex,
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

    rating: integer("rating").notNull(),
    comment: text("comment"),

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
