import { NextResponse } from "next/server";
import {
  isDataStoreConfigured,
  loadAppPayload,
  seedDatabase,
  saveProject,
  addTransaction,
  saveMaterial,
  removeMaterial,
  saveWorker,
  removeWorker,
  saveJobTemplates,
  getDbBackend,
  getDataSource,
} from "@/db/data-access";
import { createPlannerProject } from "@/db/planner-writer";

export async function GET() {
  if (!isDataStoreConfigured()) {
    return NextResponse.json(
      { error: "Database not configured", useMock: true },
      { status: 503 }
    );
  }

  try {
    let payload = await loadAppPayload();

    if (getDataSource() !== "planner" && payload.projects.length === 0) {
      await seedDatabase();
      payload = await loadAppPayload();
    }

    return NextResponse.json({
      ...payload,
      source: getDataSource() === "planner" ? "planner" : "database",
      backend: getDbBackend(),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch data", useMock: true }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isDataStoreConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === "SAVE_PROJECT") {
      await saveProject(data);
    }

    if (type === "ADD_TRANSACTION") {
      await addTransaction(data);
    }

    if (type === "CREATE_PROJECT") {
      const result = await createPlannerProject(data);
      return NextResponse.json({ success: true, ...result });
    }

    if (type === "ADD_MATERIAL") {
      const result = await saveMaterial(data);
      return NextResponse.json({ success: true, result });
    }

    if (type === "UPDATE_MATERIAL") {
      await saveMaterial(data);
    }

    if (type === "DELETE_MATERIAL") {
      await removeMaterial(data.id);
    }

    if (type === "ADD_WORKER") {
      const result = await saveWorker(data);
      return NextResponse.json({ success: true, result });
    }

    if (type === "UPDATE_WORKER") {
      await saveWorker(data);
    }

    if (type === "DELETE_WORKER") {
      await removeWorker(data.id);
    }

    if (type === "UPSERT_TEMPLATE") {
      await saveJobTemplates(data.templates);
    }

    if (type === "SEED_DATABASE") {
      const result = await seedDatabase();
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync POST Error:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
