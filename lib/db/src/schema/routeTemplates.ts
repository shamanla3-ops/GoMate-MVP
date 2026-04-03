import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    integer,
    text,
  } from "drizzle-orm/pg-core";
  import { users } from "./users.js";
  import { tripCurrencyEnum, tripTypeEnum } from "./trips.js";
  
  export const routeTemplates = pgTable("route_templates", {
    id: uuid("id").primaryKey().defaultRandom(),
  
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  
    name: varchar("name", { length: 255 }).notNull(),
  
    origin: varchar("origin", { length: 255 }).notNull(),
    destination: varchar("destination", { length: 255 }).notNull(),
  
    defaultDepartureTime: varchar("default_departure_time", { length: 50 }),
  
    availableSeats: integer("available_seats").notNull(),
    price: integer("price").notNull(),
  
    currency: tripCurrencyEnum("currency").notNull().default("EUR"),
    tripType: tripTypeEnum("trip_type").notNull().default("one-time"),
  
    weekdays: text("weekdays").array(),
  
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  });
  
  export type RouteTemplate = typeof routeTemplates.$inferSelect;
  export type NewRouteTemplate = typeof routeTemplates.$inferInsert;