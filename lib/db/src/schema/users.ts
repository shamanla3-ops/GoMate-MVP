import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  integer,
  text,
  boolean,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "driver",
  "passenger",
  "both",
]);

export const userLanguageEnum = pgEnum("user_language", [
  "pl",
  "en",
  "de",
  "ru",
  "uk",
  "es",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("passenger"),
  language: userLanguageEnum("language").notNull().default("pl"),

  avatarUrl: text("avatar_url"),
  phoneNumber: varchar("phone_number", { length: 50 }),
  carBrand: varchar("car_brand", { length: 100 }),
  carModel: varchar("car_model", { length: 100 }),
  carColor: varchar("car_color", { length: 100 }),
  carPlateNumber: varchar("car_plate_number", { length: 50 }),
  age: integer("age"),
  rating: integer("rating").notNull().default(0),
  co2SavedKg: integer("co2_saved_kg").notNull().default(0),

  emailVerified: boolean("email_verified").notNull().default(true),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationSentAt: timestamp("email_verification_sent_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;