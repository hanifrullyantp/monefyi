import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  if (!db) {
    return Response.json({ ok: true, db: "skipped" });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "connected" });
  } catch {
    return Response.json({ ok: false, db: "error" }, { status: 500 });
  }
}
