import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, asc, desc, eq, or } from "drizzle-orm";

import * as schema from "./schema/index.js";
export * from "./schema/index.js";
export { and, asc, desc, eq, or };

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString,
  });

  return drizzle(pool, { schema });
}

function getDb() {
  if (!_db) {
    _db = createDb();
  }

  return _db;
}

type DbInstance = ReturnType<typeof createDb>;

export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});