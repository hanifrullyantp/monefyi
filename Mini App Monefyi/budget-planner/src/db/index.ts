import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDrizzle?: NodePgDatabase;
};

function getPool(): Pool | null {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return null;
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({ connectionString: databaseUrl });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

/** DB opsional — bonus Lite bisa jalan tanpa Postgres (hanya health check). */
export function getDb(): NodePgDatabase | null {
  const pool = getPool();
  if (!pool) return null;
  if (!globalForDb.__arenaNextJsDrizzle) {
    globalForDb.__arenaNextJsDrizzle = drizzle(pool);
  }
  return globalForDb.__arenaNextJsDrizzle;
}

/** @deprecated Prefer getDb() — null jika DATABASE_URL kosong. */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) {
      throw new Error("DATABASE_URL is required for this operation");
    }
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const pool = getPool();
