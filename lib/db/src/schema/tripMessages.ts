import {
    pgTable,
    uuid,
    timestamp,
    text,
  } from "drizzle-orm/pg-core";
  import { tripChats } from "./tripChats.js";
  import { users } from "./users.js";
  
  export const tripMessages = pgTable("trip_messages", {
    id: uuid("id").primaryKey().defaultRandom(),
  
    chatId: uuid("chat_id")
      .notNull()
      .references(() => tripChats.id, { onDelete: "cascade" }),
  
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  
    text: text("text").notNull(),
  
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  });
  
  export type TripMessage = typeof tripMessages.$inferSelect;
  export type NewTripMessage = typeof tripMessages.$inferInsert;