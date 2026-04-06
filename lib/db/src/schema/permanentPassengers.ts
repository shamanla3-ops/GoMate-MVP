import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { trips } from "./trips.js";
import { routeTemplates } from "./routeTemplates.js";

export const permanentPassengerRequestDirectionEnum = pgEnum(
  "permanent_passenger_request_direction",
  ["request", "invitation"]
);

export const permanentPassengerRequestStatusEnum = pgEnum(
  "permanent_passenger_request_status",
  ["pending", "accepted", "rejected", "cancelled"]
);

export const permanentPassengerRelationshipStatusEnum = pgEnum(
  "permanent_passenger_relationship_status",
  ["active", "inactive"]
);

export const permanentPassengerRequests = pgTable(
  "permanent_passenger_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    driverId: uuid("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    passengerId: uuid("passenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    direction: permanentPassengerRequestDirectionEnum("direction").notNull(),

    templateId: uuid("template_id").references(() => routeTemplates.id, {
      onDelete: "set null",
    }),

    tripId: uuid("trip_id").references(() => trips.id, {
      onDelete: "set null",
    }),

    originText: varchar("origin_text", { length: 255 }),
    destinationText: varchar("destination_text", { length: 255 }),

    preferredTime: varchar("preferred_time", { length: 50 }),

    weekdays: text("weekdays").array().notNull(),

    note: text("note"),

    /** Stable key for duplicate pending / active pattern detection */
    patternKey: text("pattern_key").notNull(),

    status: permanentPassengerRequestStatusEnum("status")
      .notNull()
      .default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    respondedAt: timestamp("responded_at", { withTimezone: true }),
  }
);

export const permanentPassengerRelationships = pgTable(
  "permanent_passenger_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    driverId: uuid("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    passengerId: uuid("passenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    sourceRequestId: uuid("source_request_id").references(
      () => permanentPassengerRequests.id,
      { onDelete: "set null" }
    ),

    templateId: uuid("template_id").references(() => routeTemplates.id, {
      onDelete: "set null",
    }),

    preferredTime: varchar("preferred_time", { length: 50 }),

    weekdays: text("weekdays").array().notNull(),

    patternKey: text("pattern_key").notNull(),

    originText: varchar("origin_text", { length: 255 }),
    destinationText: varchar("destination_text", { length: 255 }),

    status: permanentPassengerRelationshipStatusEnum("status")
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    endedAt: timestamp("ended_at", { withTimezone: true }),
  }
);

export const permanentPassengerSkips = pgTable("permanent_passenger_skips", {
  id: uuid("id").primaryKey().defaultRandom(),

  relationshipId: uuid("relationship_id")
    .notNull()
    .references(() => permanentPassengerRelationships.id, {
      onDelete: "cascade",
    }),

  skipDate: date("skip_date", { mode: "string" }).notNull(),

  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PermanentPassengerRequest =
  typeof permanentPassengerRequests.$inferSelect;
export type NewPermanentPassengerRequest =
  typeof permanentPassengerRequests.$inferInsert;

export type PermanentPassengerRelationship =
  typeof permanentPassengerRelationships.$inferSelect;
export type NewPermanentPassengerRelationship =
  typeof permanentPassengerRelationships.$inferInsert;

export type PermanentPassengerSkip =
  typeof permanentPassengerSkips.$inferSelect;
export type NewPermanentPassengerSkip =
  typeof permanentPassengerSkips.$inferInsert;
