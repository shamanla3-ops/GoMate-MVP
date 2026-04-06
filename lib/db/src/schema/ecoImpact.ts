import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { trips } from "./trips.js";
import { users } from "./users.js";

export const ecoImpactRoleEnum = pgEnum("eco_impact_role", ["driver", "passenger"]);

/**
 * One row per participant per completed trip. Uniqueness (trip_id, user_id) prevents double counting.
 */
export const ecoImpactRecords = pgTable(
  "eco_impact_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: ecoImpactRoleEnum("role").notNull(),

    distanceKm: doublePrecision("distance_km").notNull(),

    /** This participant's attributed share of CO₂ saved (kg) for this trip */
    co2SavedKg: doublePrecision("co2_saved_kg").notNull(),

    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqTripUser: uniqueIndex("eco_impact_trip_user_uidx").on(table.tripId, table.userId),
  })
);

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    badgeCode: varchar("badge_code", { length: 64 }).notNull(),

    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqUserCode: uniqueIndex("user_badges_user_code_uidx").on(table.userId, table.badgeCode),
  })
);

export type EcoImpactRecord = typeof ecoImpactRecords.$inferSelect;
export type NewEcoImpactRecord = typeof ecoImpactRecords.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
