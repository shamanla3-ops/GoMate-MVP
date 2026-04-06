import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { routeTemplates } from "./routeTemplates.js";

/** Role for what this preference is looking to match */
export const matchPreferenceRoleEnum = pgEnum("match_preference_role", [
  "passenger",
  "driver",
  "both",
]);

export const routeMatchPreferences = pgTable("route_match_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  role: matchPreferenceRoleEnum("role").notNull(),

  originText: varchar("origin_text", { length: 255 }).notNull(),
  destinationText: varchar("destination_text", { length: 255 }).notNull(),

  /** Local time-of-day label, typically HH:MM */
  preferredTime: varchar("preferred_time", { length: 50 }).notNull(),

  /** Extra minutes beyond default threshold (±30) */
  timeFlexMinutes: integer("time_flex_minutes"),

  weekdays: text("weekdays").array().notNull(),

  isActive: boolean("is_active").notNull().default(true),

  templateId: uuid("template_id").references(() => routeTemplates.id, {
    onDelete: "set null",
  }),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RouteMatchPreference = typeof routeMatchPreferences.$inferSelect;
export type NewRouteMatchPreference = typeof routeMatchPreferences.$inferInsert;
