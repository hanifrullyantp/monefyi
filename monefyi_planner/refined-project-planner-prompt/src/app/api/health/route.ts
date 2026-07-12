import { checkDatabaseHealth, getDbBackend, isDataStoreConfigured } from "@/db/data-access";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDataStoreConfigured()) {
    return Response.json({ ok: false, reason: "Database not configured" }, { status: 503 });
  }

  const healthy = await checkDatabaseHealth();
  if (!healthy) {
    return Response.json({ ok: false, database: false, backend: getDbBackend() }, { status: 500 });
  }

  return Response.json({ ok: true, database: true, backend: getDbBackend() });
}
