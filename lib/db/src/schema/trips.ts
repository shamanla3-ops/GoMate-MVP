import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
  text,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const tripStatusEnum = pgEnum("trip_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

export const tripCurrencyEnum = pgEnum("trip_currency", [
  "EUR",
  "USD",
  "PLN",
]);

export const tripTypeEnum = pgEnum("trip_type", [
  "one-time",
  "regular",
]);

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),

  driverId: uuid("driver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  origin: varchar("origin", { length: 255 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),

  originLat: doublePrecision("origin_lat"),
  originLng: doublePrecision("origin_lng"),
  destinationLat: doublePrecision("destination_lat"),
  destinationLng: doublePrecision("destination_lng"),

  departureTime: timestamp("departure_time", { withTimezone: true }).notNull(),

  seatsTotal: integer("seats_total").notNull().default(1),
  availableSeats: integer("available_seats").notNull(),

  price: integer("price").notNull(),
  currency: tripCurrencyEnum("currency").notNull().default("EUR"),

  tripType: tripTypeEnum("trip_type").notNull().default("one-time"),

  weekdays: text("weekdays").array(),

  status: tripStatusEnum("status").notNull().default("scheduled"),

  /** Driving duration from routing (OSRM), minutes */
  estimatedDurationMinutes: integer("estimated_duration_minutes"),

  /** departure_time + estimated route duration */
  expectedEndTime: timestamp("expected_end_time", { withTimezone: true }),

  completedAt: timestamp("completed_at", { withTimezone: true }),

  /** "automatic" | "manual" — set when trip is completed */
  completionMode: text("completion_mode"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;