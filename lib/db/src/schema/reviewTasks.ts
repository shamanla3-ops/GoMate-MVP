import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { trips } from "./trips.js";
import { users } from "./users.js";

export const reviewTaskStatusEnum = pgEnum("review_task_status", [
  "pending",
  "done",
  "expired",
]);

export const reviewTasks = pgTable(
  "review_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),

    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: reviewTaskStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqTripReviewerTarget: uniqueIndex("review_tasks_trip_reviewer_target").on(
      table.tripId,
      table.reviewerUserId,
      table.targetUserId
    ),
  })
);

export type ReviewTask = typeof reviewTasks.$inferSelect;
export type NewReviewTask = typeof reviewTasks.$inferInsert;
