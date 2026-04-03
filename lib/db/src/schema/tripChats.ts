import {
  pgTable,
  uuid,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { trips } from "./trips.js";
import { users } from "./users.js";

export const tripChats = pgTable(
  "trip_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),

    driverId: uuid("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    passengerId: uuid("passenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    driverLastReadAt: timestamp("driver_last_read_at", { withTimezone: true }),

    passengerLastReadAt: timestamp("passenger_last_read_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueTripPassengerChat: unique("trip_chats_trip_passenger_unique").on(
      table.tripId,
      table.passengerId
    ),
  })
);

export type TripChat = typeof tripChats.$inferSelect;
export type NewTripChat = typeof tripChats.$inferInsert;