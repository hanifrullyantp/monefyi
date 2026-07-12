import { db, isDbConfigured } from "./index";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase-admin";
import { materials, workers, appConfig } from "./schema";
import { APP_DATA } from "@/lib/mock-data";
import { mapMaterialRow, mapWorkerRow } from "@/lib/db-mapper";
import {
  normalizeMaterialRow,
  normalizeWorkerRow,
  normalizeConfigRow,
} from "./row-normalize";

export type RppMasterPayload = {
  database: typeof APP_DATA.database;
};

function databaseMetaArray(meta: Record<string, unknown>, key: string) {
  const val = meta[key];
  return Array.isArray(val) ? val : undefined;
}

function assembleDatabase(input: {
  materialRows: Parameters<typeof mapMaterialRow>[0][];
  workerRows: Parameters<typeof mapWorkerRow>[0][];
  databaseMeta: Record<string, unknown>;
  jobTemplates: typeof APP_DATA.database.templates;
}): typeof APP_DATA.database {
  return {
    materials: input.materialRows.map((r) => mapMaterialRow(r)),
    workers: input.workerRows.map((r) => mapWorkerRow(r)),
    tools:
      (databaseMetaArray(input.databaseMeta, "tools") as typeof APP_DATA.database.tools) ||
      APP_DATA.database.tools,
    vendors:
      (databaseMetaArray(input.databaseMeta, "vendors") as typeof APP_DATA.database.vendors) ||
      APP_DATA.database.vendors,
    clients:
      (databaseMetaArray(input.databaseMeta, "clients") as typeof APP_DATA.database.clients) ||
      APP_DATA.database.clients,
    templates:
      input.jobTemplates.length > 0
        ? input.jobTemplates
        : (databaseMetaArray(input.databaseMeta, "templates") as typeof APP_DATA.database.templates) ||
          APP_DATA.database.templates,
  };
}

/**
 * Load rpp_* master data (materials, workers, templates) from Supabase or local Postgres.
 */
export async function loadRppMasterPayload(): Promise<RppMasterPayload> {
  if (isDbConfigured() && db) {
    const [materialRows, workerRows, configRows] = await Promise.all([
      db.select().from(materials),
      db.select().from(workers),
      db.select().from(appConfig),
    ]);

    const databaseMeta =
      (configRows.find((c) => c.key === "database_meta")?.payload as Record<string, unknown>) || {};
    const jobTemplatesPayload = configRows.find((c) => c.key === "job_templates")?.payload;
    const jobTemplates = Array.isArray(jobTemplatesPayload)
      ? (jobTemplatesPayload as typeof APP_DATA.database.templates)
      : [];

    return {
      database: assembleDatabase({
        materialRows,
        workerRows,
        databaseMeta,
        jobTemplates,
      }),
    };
  }

  const client = getSupabaseAdmin();
  if (!client) {
    return { database: APP_DATA.database };
  }

  const [materialRes, workerRes, configRes] = await Promise.all([
    client.from("rpp_materials").select("*").order("name"),
    client.from("rpp_workers").select("*").order("name"),
    client.from("rpp_app_config").select("*"),
  ]);

  for (const res of [materialRes, workerRes, configRes]) {
    if (res.error) throw res.error;
  }

  const configRows = (configRes.data || []).map((row) =>
    normalizeConfigRow(row as Record<string, unknown>)
  );
  const databaseMeta =
    (configRows.find((c) => c.key === "database_meta")?.payload as Record<string, unknown>) || {};
  const jobTemplatesRow = configRows.find((c) => c.key === "job_templates");
  const jobTemplates = Array.isArray(jobTemplatesRow?.payload)
    ? (jobTemplatesRow!.payload as typeof APP_DATA.database.templates)
    : [];

  const materialRows = (materialRes.data || []).map((row) =>
    normalizeMaterialRow(row as Record<string, unknown>)
  );
  const workerRows = (workerRes.data || []).map((row) =>
    normalizeWorkerRow(row as Record<string, unknown>)
  );

  return {
    database: assembleDatabase({
      materialRows,
      workerRows,
      databaseMeta,
      jobTemplates,
    }),
  };
}

/**
 * Seed rpp master tables from APP_DATA when empty (planner hybrid mode).
 */
export async function seedRppMasterIfEmpty(): Promise<{ seeded: boolean; message: string }> {
  if (!isSupabaseConfigured() && !(isDbConfigured() && db)) {
    return { seeded: false, message: "No rpp store configured" };
  }

  const current = await loadRppMasterPayload();
  if (current.database.materials.length > 0) {
    return { seeded: false, message: "RPP master already has materials" };
  }

  const databaseMeta = {
    tools: APP_DATA.database.tools,
    vendors: APP_DATA.database.vendors,
    clients: APP_DATA.database.clients,
    templates: APP_DATA.database.templates,
  };

  if (isDbConfigured() && db) {
    for (const m of APP_DATA.database.materials) {
      await db.insert(materials).values({
        name: m.name,
        category: m.category,
        unit: m.unit,
        price: m.price,
        lastPrice: m.lastPrice,
        trend: m.trend,
        stock: String(m.stock),
        usedIn: m.usedIn,
        icon: m.icon,
        vendor: m.vendor,
      });
    }
    for (const w of APP_DATA.database.workers) {
      await db.insert(workers).values({
        name: w.name,
        level: w.level,
        rate: w.rate,
        contact: w.contact,
        rating: w.rating,
      });
    }
    await db
      .insert(appConfig)
      .values({ key: "database_meta", payload: databaseMeta })
      .onConflictDoUpdate({ target: appConfig.key, set: { payload: databaseMeta } });
    await db
      .insert(appConfig)
      .values({ key: "job_templates", payload: APP_DATA.database.templates })
      .onConflictDoUpdate({
        target: appConfig.key,
        set: { payload: APP_DATA.database.templates },
      });
    return { seeded: true, message: "RPP master seeded (postgres)" };
  }

  const client = getSupabaseAdmin()!;
  const { error: matErr } = await client.from("rpp_materials").insert(
    APP_DATA.database.materials.map((m) => ({
      name: m.name,
      category: m.category,
      unit: m.unit,
      price: m.price,
      last_price: m.lastPrice,
      trend: m.trend,
      stock: m.stock,
      used_in: m.usedIn,
      icon: m.icon,
      vendor: m.vendor,
    }))
  );
  if (matErr) throw matErr;

  const { error: workerErr } = await client.from("rpp_workers").insert(
    APP_DATA.database.workers.map((w) => ({
      name: w.name,
      level: w.level,
      rate: w.rate,
      contact: w.contact,
      rating: w.rating,
    }))
  );
  if (workerErr) throw workerErr;

  const { error: configErr } = await client.from("rpp_app_config").upsert(
    [
      { key: "database_meta", payload: databaseMeta },
      { key: "job_templates", payload: APP_DATA.database.templates },
    ],
    { onConflict: "key" }
  );
  if (configErr) throw configErr;

  return { seeded: true, message: "RPP master seeded (supabase)" };
}

export function isRppMasterAvailable(): boolean {
  return isSupabaseConfigured() || (isDbConfigured() && Boolean(db));
}
