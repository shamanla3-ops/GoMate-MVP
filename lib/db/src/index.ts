import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";

import * as schema from "./schema/index.js";
export * from "./schema/index.js";
export { and, asc, count, desc, eq, or, sql };

/**
 * Neon / hosted Postgres URLs often use sslmode=require|prefer, which newer `pg`
 * maps with a deprecation warning. Explicit verify-full matches current behavior
 * and silences the warning (see pg-connection-string / pg SSL docs).
 */
function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const isHosted =
      host.includes("neon.tech") ||
      host.includes("amazonaws.com") ||
      host.includes("supabase.co") ||
      host.endsWith(".pooler.supabase.com");
    if (!isHosted) {
      return url;
    }
    const mode = u.searchParams.get("sslmode");
    if (
      mode === null ||
      mode === "require" ||
      mode === "prefer" ||
      mode === "verify-ca"
    ) {
      u.searchParams.set("sslmode", "verify-full");
    }
    return u.toString();
  } catch {
    return url;
  }
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: normalizeDatabaseUrl(connectionString),
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