const path = require("path");
const dotenv = require("dotenv");
const { defineConfig } = require("drizzle-kit");

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
  override: true,
});

module.exports = defineConfig({
  schema: [
    "./dist/schema/users.js",
    "./dist/schema/trips.js",
    "./dist/schema/routeTemplates.js",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/gomate",
  },
});