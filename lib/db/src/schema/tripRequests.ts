import {
  pgTable,
  uuid,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { trips } from "./trips.js";
import { users } from "./users.js";

export const tripRequestStatusEnum = pgEnum("trip_request_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
  "cancelled_by_driver",
  "cancelled_by_passenger",
]);

export const tripRequests = pgTable("trip_requests", {
  id: uuid("id").primaryKey().defaultRandom(),

  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),

  passengerId: uuid("passenger_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  seatsRequested: integer("seats_requested").notNull().default(1),

  status: tripRequestStatusEnum("status").notNull().default("pending"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TripRequest = typeof tripRequests.$inferSelect;
export type NewTripRequest = typeof tripRequests.$inferInsert;