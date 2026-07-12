/**
 * One-time remote setup: create rpp_* tables via Supabase Management API.
 * Usage: npm run db:remote-setup
 */
import { config } from "dotenv";
import { resolve } from "path";
import { RPP_SETUP_SQL } from "./setup-sql";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), "../../my-supabase-project/.env") });

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF;

async function runQuery(query: string) {
  if (!token || !projectRef) {
    throw new Error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF required");
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function main() {
  console.log("Creating rpp_* tables on Supabase...");
  await runQuery(RPP_SETUP_SQL);
  console.log("Done — tables ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
