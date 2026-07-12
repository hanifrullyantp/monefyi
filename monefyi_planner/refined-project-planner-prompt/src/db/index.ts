import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __plannerPgPool?: Pool;
};

function createPool() {
  if (!databaseUrl) return null;
  return new Pool({ connectionString: databaseUrl });
}

export const pool = globalForDb.__plannerPgPool ?? createPool();

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__plannerPgPool = pool;
}

export const db = pool ? drizzle(pool) : null;

export function isDbConfigured(): boolean {
  return Boolean(databaseUrl && db);
}
