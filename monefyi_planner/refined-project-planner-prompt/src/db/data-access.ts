import { db, isDbConfigured } from "./index";
import { isSupabaseConfigured, getSupabaseAdmin } from "./supabase-admin";
import {
  projects,
  transactions,
  materials,
  workers,
  businessAccounts,
  appConfig,
} from "./schema";
import { eq } from "drizzle-orm";
import { APP_DATA } from "@/lib/mock-data";
import {
  projectToDbRow,
  transactionsFromProject,
  assembleAppPayload,
} from "@/lib/db-mapper";
import {
  normalizeProjectRow,
  normalizeTransactionRow,
  normalizeMaterialRow,
  normalizeWorkerRow,
  normalizeAccountRow,
  normalizeConfigRow,
  projectToSupabaseRow,
  transactionToSupabaseRow,
} from "./row-normalize";
import { loadPlannerPayload } from "./planner-loader";
import { savePlannerProject, addPlannerTransaction } from "./planner-writer";
import { loadRppMasterPayload, seedRppMasterIfEmpty, isRppMasterAvailable } from "./rpp-master-loader";
import { aggregatePlannerFinance } from "./finance-aggregator";
import {
  addMaterial,
  updateMaterial,
  deleteMaterial,
  addWorker,
  updateWorker,
  deleteWorker,
  upsertJobTemplates,
} from "./rpp-master-writer";

export type DbBackend = "postgres" | "supabase" | "planner" | "none";

export function getDataSource(): "planner" | "sandbox" {
  const source = (process.env.DATA_SOURCE || "planner").toLowerCase();
  return source === "sandbox" || source === "rpp" ? "sandbox" : "planner";
}

export function getDbBackend(): DbBackend {
  if (getDataSource() === "planner" && isSupabaseConfigured()) return "planner";
  if (isDbConfigured() && db) return "postgres";
  if (isSupabaseConfigured() && getSupabaseAdmin()) return "supabase";
  return "none";
}

export function isDataStoreConfigured(): boolean {
  return getDbBackend() !== "none";
}

async function pingStore(): Promise<void> {
  const backend = getDbBackend();
  if (backend === "planner") {
    await loadPlannerPayload();
    return;
  }
  if (backend === "postgres" && db) {
    await db.select({ id: projects.id }).from(projects).limit(1);
    return;
  }
  if (backend === "supabase" && getSupabaseAdmin()) {
    const { error } = await getSupabaseAdmin()!.from("rpp_projects").select("id").limit(1);
    if (error) throw error;
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pingStore();
    return true;
  } catch {
    return false;
  }
}

export async function loadAppPayload() {
  const backend = getDbBackend();
  if (backend === "none") {
    throw new Error("No database backend configured");
  }

  if (backend === "planner") {
    const plannerPayload = await loadPlannerPayload();
    let database = plannerPayload.database;
    if (isRppMasterAvailable()) {
      await seedRppMasterIfEmpty();
      const rppMaster = await loadRppMasterPayload();
      database = rppMaster.database;
    }
    const financeOverlay = await aggregatePlannerFinance();
    const business = financeOverlay
      ? { ...plannerPayload.business, ...financeOverlay, name: plannerPayload.business.name }
      : plannerPayload.business;
    return { ...plannerPayload, database, business };
  }

  if (backend === "postgres" && db) {
    const [
      projectRows,
      transactionRows,
      materialRows,
      workerRows,
      accountRows,
      configRows,
    ] = await Promise.all([
      db.select().from(projects),
      db.select().from(transactions),
      db.select().from(materials),
      db.select().from(workers),
      db.select().from(businessAccounts),
      db.select().from(appConfig),
    ]);

    const businessMeta =
      (configRows.find((c) => c.key === "business_meta")?.payload as Record<string, unknown>) || {};
    const databaseMeta =
      (configRows.find((c) => c.key === "database_meta")?.payload as Record<string, unknown>) || {};

    return assembleAppPayload({
      projectRows,
      transactionRows,
      materialRows,
      workerRows,
      accountRows,
      businessMeta,
      databaseMeta,
    });
  }

  const client = getSupabaseAdmin()!;
  const [
    projectRes,
    txRes,
    materialRes,
    workerRes,
    accountRes,
    configRes,
  ] = await Promise.all([
    client.from("rpp_projects").select("*"),
    client.from("rpp_transactions").select("*"),
    client.from("rpp_materials").select("*"),
    client.from("rpp_workers").select("*"),
    client.from("rpp_business_accounts").select("*"),
    client.from("rpp_app_config").select("*"),
  ]);

  for (const res of [projectRes, txRes, materialRes, workerRes, accountRes, configRes]) {
    if (res.error) throw res.error;
  }

  const configRows = (configRes.data || []).map((row) =>
    normalizeConfigRow(row as Record<string, unknown>)
  );
  const businessMeta =
    (configRows.find((c) => c.key === "business_meta")?.payload as Record<string, unknown>) || {};
  const databaseMeta =
    (configRows.find((c) => c.key === "database_meta")?.payload as Record<string, unknown>) || {};

  return assembleAppPayload({
    projectRows: (projectRes.data || []).map((row) =>
      normalizeProjectRow(row as Record<string, unknown>)
    ),
    transactionRows: (txRes.data || []).map((row) =>
      normalizeTransactionRow(row as Record<string, unknown>)
    ),
    materialRows: (materialRes.data || []).map((row) =>
      normalizeMaterialRow(row as Record<string, unknown>)
    ),
    workerRows: (workerRes.data || []).map((row) =>
      normalizeWorkerRow(row as Record<string, unknown>)
    ),
    accountRows: (accountRes.data || []).map((row) =>
      normalizeAccountRow(row as Record<string, unknown>)
    ),
    businessMeta,
    databaseMeta,
  });
}

export async function seedDatabase() {
  if (getDataSource() === "planner") {
    return { seeded: false, message: "Planner source uses live data — skip seed" };
  }

  const backend = getDbBackend();
  if (backend === "none") {
    throw new Error("No database backend configured");
  }

  if (backend === "postgres" && db) {
    const existing = await db.select().from(projects).limit(1);
    if (existing.length > 0) {
      return { seeded: false, message: "Database already has data — skip seed" };
    }

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

    for (const a of APP_DATA.business.accounts) {
      await db.insert(businessAccounts).values({
        name: a.name,
        balance: a.balance,
        icon: a.icon,
      });
    }

    const { accounts: _accounts, ...businessMeta } = APP_DATA.business;
    await db
      .insert(appConfig)
      .values({ key: "business_meta", payload: businessMeta })
      .onConflictDoUpdate({
        target: appConfig.key,
        set: { payload: businessMeta },
      });

    const databaseMeta = {
      tools: APP_DATA.database.tools,
      vendors: APP_DATA.database.vendors,
      clients: APP_DATA.database.clients,
      templates: APP_DATA.database.templates,
    };

    await db
      .insert(appConfig)
      .values({ key: "database_meta", payload: databaseMeta })
      .onConflictDoUpdate({
        target: appConfig.key,
        set: { payload: databaseMeta },
      });

    for (const p of APP_DATA.projects) {
      const [inserted] = await db
        .insert(projects)
        .values(projectToDbRow(p))
        .returning({ id: projects.id });

      const txRows = transactionsFromProject({ ...p, id: inserted.id });
      if (txRows.length > 0) {
        await db.insert(transactions).values(txRows);
      }
    }

    return { seeded: true, message: "Database seeded from APP_DATA" };
  }

  const client = getSupabaseAdmin()!;
  const { data: existing } = await client.from("rpp_projects").select("id").limit(1);
  if (existing && existing.length > 0) {
    return { seeded: false, message: "Database already has data — skip seed" };
  }

  if (APP_DATA.database.materials.length > 0) {
    const { error } = await client.from("rpp_materials").insert(
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
    if (error) throw error;
  }

  if (APP_DATA.database.workers.length > 0) {
    const { error } = await client.from("rpp_workers").insert(
      APP_DATA.database.workers.map((w) => ({
        name: w.name,
        level: w.level,
        rate: w.rate,
        contact: w.contact,
        rating: w.rating,
      }))
    );
    if (error) throw error;
  }

  if (APP_DATA.business.accounts.length > 0) {
    const { error } = await client.from("rpp_business_accounts").insert(
      APP_DATA.business.accounts.map((a) => ({
        name: a.name,
        balance: a.balance,
        icon: a.icon,
      }))
    );
    if (error) throw error;
  }

  const { accounts: _accounts, ...businessMeta } = APP_DATA.business;
  const databaseMeta = {
    tools: APP_DATA.database.tools,
    vendors: APP_DATA.database.vendors,
    clients: APP_DATA.database.clients,
    templates: APP_DATA.database.templates,
  };

  const { error: configError } = await client.from("rpp_app_config").upsert(
    [
      { key: "business_meta", payload: businessMeta },
      { key: "database_meta", payload: databaseMeta },
    ],
    { onConflict: "key" }
  );
  if (configError) throw configError;

  for (const p of APP_DATA.projects) {
    const { data: inserted, error: projectError } = await client
      .from("rpp_projects")
      .insert(projectToSupabaseRow(projectToDbRow(p)))
      .select("id")
      .single();
    if (projectError) throw projectError;

    const txRows = transactionsFromProject({ ...p, id: inserted.id });
    if (txRows.length > 0) {
      const { error: txError } = await client
        .from("rpp_transactions")
        .insert(txRows.map(transactionToSupabaseRow));
      if (txError) throw txError;
    }
  }

  return { seeded: true, message: "Database seeded from APP_DATA (Supabase)" };
}

export async function saveProject(data: { id?: number | string; [key: string]: unknown }) {
  const backend = getDbBackend();
  if (backend === "none") throw new Error("No database backend configured");

  if (backend === "planner") {
    await savePlannerProject(data);
    return;
  }

  const { id, ...rest } = data;
  const row = projectToDbRow(rest as Parameters<typeof projectToDbRow>[0]);

  if (backend === "postgres" && db) {
    if (id && typeof id === "number") {
      await db.update(projects).set(row).where(eq(projects.id, id));
      return;
    }
    await db.insert(projects).values(row);
    return;
  }

  const client = getSupabaseAdmin()!;
  const supabaseRow = projectToSupabaseRow(row);
  if (id && typeof id === "number") {
    const { error } = await client.from("rpp_projects").update(supabaseRow).eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await client.from("rpp_projects").insert(supabaseRow);
  if (error) throw error;
}

export async function addTransaction(data: {
  projectId: number | string;
  type: string;
  category?: string;
  name: string;
  amount: number;
  date?: string;
  time?: string;
  icon?: string;
  note?: string;
}) {
  const backend = getDbBackend();
  if (backend === "none") throw new Error("No database backend configured");

  if (backend === "planner") {
    await addPlannerTransaction(data);
    return;
  }

  const sandboxProjectId =
    typeof data.projectId === "number" ? data.projectId : Number(data.projectId);
  if (!Number.isFinite(sandboxProjectId)) {
    throw new Error("Invalid project id for sandbox backend");
  }

  if (backend === "postgres" && db) {
    await db.insert(transactions).values({
      projectId: sandboxProjectId,
      type: data.type,
      category: data.category || "Umum",
      name: data.name,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      time: data.time,
      icon: data.icon,
      note: data.note,
    });
    return;
  }

  const client = getSupabaseAdmin()!;
  const { error } = await client.from("rpp_transactions").insert(
    transactionToSupabaseRow({
      projectId: sandboxProjectId,
      type: data.type,
      category: data.category || "Umum",
      name: data.name,
      amount: data.amount,
      date: data.date ? new Date(data.date) : new Date(),
      time: data.time,
      icon: data.icon,
      note: data.note,
    })
  );
  if (error) throw error;
}

export async function saveMaterial(data: Parameters<typeof addMaterial>[0] & { id?: number }) {
  if (data.id) {
    await updateMaterial({ ...data, id: data.id });
    return { id: data.id };
  }
  const row = await addMaterial(data);
  return row;
}

export async function removeMaterial(id: number) {
  await deleteMaterial(id);
}

export async function saveWorker(data: Parameters<typeof addWorker>[0] & { id?: number }) {
  if (data.id) {
    await updateWorker({ ...data, id: data.id });
    return { id: data.id };
  }
  const row = await addWorker(data);
  return row;
}

export async function removeWorker(id: number) {
  await deleteWorker(id);
}

export async function saveJobTemplates(templates: typeof APP_DATA.database.templates) {
  await upsertJobTemplates(templates);
}
