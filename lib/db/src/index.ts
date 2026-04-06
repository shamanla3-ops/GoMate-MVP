import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";

import * as schema from "./schema/index.js";
export * from "./schema/index.js";
export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  sum,
};

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  _pool = new Pool({
    connectionString,
  });

  return drizzle(_pool, { schema });
}

function getDb() {
  if (!_db) {
    _db = createDb();
  }

  return _db;
}

/** Ends the shared pool (e.g. after CLI scripts). Safe to call once. */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
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
