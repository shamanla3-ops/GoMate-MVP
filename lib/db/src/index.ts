import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import * as schema from "./schema/index.js";
export * from "./schema/index.js";
export { and, asc, count, desc, eq, isNotNull, isNull, lte, or, sql };

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
    const value = Reflect.get(getDb(), prop) as unknown;
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(getDb());
    }
    return value;
  },
});
