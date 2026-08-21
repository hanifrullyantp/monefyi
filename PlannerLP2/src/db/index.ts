import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __plannerLp2PgPool?: Pool;
};

function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

export function getDbPool(): Pool | null {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!globalForDb.__plannerLp2PgPool) {
    globalForDb.__plannerLp2PgPool = new Pool({ connectionString: databaseUrl });
  }

  return globalForDb.__plannerLp2PgPool;
}

export function getDb() {
  const pool = getDbPool();
  if (!pool) return null;
  return drizzle(pool);
}
