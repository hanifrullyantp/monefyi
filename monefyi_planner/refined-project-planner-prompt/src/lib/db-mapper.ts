// =====================================================
// Server-side mapper: PostgreSQL rows ↔ APP_DATA shape
// =====================================================

import { APP_DATA } from "@/lib/mock-data";
import type { projects, transactions, materials, workers, businessAccounts } from "@/db/schema";

type DbProject = typeof projects.$inferSelect;
type DbTransaction = typeof transactions.$inferSelect;
type DbMaterial = typeof materials.$inferSelect;
type DbWorker = typeof workers.$inferSelect;
type DbAccount = typeof businessAccounts.$inferSelect;

type AppProject = (typeof APP_DATA.projects)[number];
type ProjectMetadata = {
  duration?: number;
  categories?: string[];
  products?: AppProject["products"];
  budget?: AppProject["budget"];
  hutangPiutang?: AppProject["hutangPiutang"];
  progressDeviation?: number;
};

function toDateStr(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

function toTimeStr(value: Date | string | null | undefined): string {
  if (!value) return "00:00";
  const d = value instanceof Date ? value : new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Map DB project row + transactions into frontend project object.
 */
export function mapProjectRow(
  row: DbProject,
  projectTx: DbTransaction[]
): AppProject {
  const meta = (row.metadata || {}) as ProjectMetadata;
  const rap = (row.rapData || { materials: [], workers: [] }) as AppProject["rap"];
  const timeline = (row.timelineData || []) as AppProject["timeline"];
  const payments = projectTx
    .filter((t) => t.category === "Pembayaran")
    .map((t) => ({
      id: t.id,
      type: "in" as const,
      name: t.name,
      amount: t.amount,
      date: toDateStr(t.date),
      time: t.time || toTimeStr(t.date),
      icon: t.icon || "arrow-down-circle",
    }));
  const expenses = projectTx
    .filter((t) => t.category !== "Pembayaran")
    .map((t) => ({
      id: t.id,
      type: t.type as "in" | "out",
      category: t.category,
      name: t.name,
      amount: t.amount,
      date: toDateStr(t.date),
      time: t.time || toTimeStr(t.date),
      icon: t.icon || (t.type === "out" ? "arrow-up-circle" : "arrow-down-circle"),
    }));

  const start = toDateStr(row.startDate);
  const end = toDateStr(row.endDate);
  const duration =
    meta.duration ??
    Math.max(
      1,
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
      )
    );

  return {
    id: row.id,
    name: row.name,
    client: row.client,
    type: row.type,
    startDate: start,
    endDate: end,
    duration,
    contractValue: row.contractValue,
    saldo: row.saldo ?? 0,
    status: (row.status || "ok") as AppProject["status"],
    categories: meta.categories || [],
    products: meta.products || [],
    progress: {
      plan: row.progressPlan ?? 0,
      actual: row.progressActual ?? 0,
      deviation: meta.progressDeviation ?? (row.progressActual ?? 0) - (row.progressPlan ?? 0),
    },
    rap: rap || { totalRAP: 0, realisasi: 0, estLaba: 0, materials: [], workers: [] },
    budget: meta.budget || { bahan: { plan: 0, actual: 0 }, tukang: { plan: 0, actual: 0 }, piutang: 0, hutang: 0 },
    payments,
    expenses,
    timeline,
    hutangPiutang: meta.hutangPiutang || [],
  };
}

export function mapMaterialRow(row: DbMaterial) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    price: row.price,
    lastPrice: row.lastPrice ?? row.price,
    trend: (row.trend || "stable") as "up" | "down" | "stable",
    usedIn: row.usedIn ?? 0,
    stock: Number(row.stock ?? 0),
    icon: row.icon || "package",
    vendor: row.vendor || "",
  };
}

export function mapWorkerRow(row: DbWorker) {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    rate: row.rate,
    contact: row.contact || "",
    rating: row.rating ?? 5,
  };
}

export function mapAccountRow(row: DbAccount) {
  return {
    id: row.id,
    name: row.name,
    balance: row.balance,
    icon: row.icon || "landmark",
  };
}

/**
 * Build full APP payload from DB query results.
 */
export function assembleAppPayload(input: {
  projectRows: DbProject[];
  transactionRows: DbTransaction[];
  materialRows: DbMaterial[];
  workerRows: DbWorker[];
  accountRows: DbAccount[];
  businessMeta: Record<string, unknown>;
  databaseMeta: Record<string, unknown>;
}) {
  const projects = input.projectRows.map((row) =>
    mapProjectRow(
      row,
      input.transactionRows.filter((t) => t.projectId === row.id)
    )
  );

  const accounts = input.accountRows.map(mapAccountRow);
  const totalKas = accounts.reduce((s, a) => s + a.balance, 0);

  const businessMeta = input.businessMeta;
  const databaseMeta = input.databaseMeta;

  return {
    projects,
    database: {
      materials: input.materialRows.map(mapMaterialRow),
      workers: input.workerRows.map(mapWorkerRow),
      tools: (databaseMetaArray(databaseMeta, "tools") as typeof APP_DATA.database.tools) || [],
      vendors: (databaseMetaArray(databaseMeta, "vendors") as typeof APP_DATA.database.vendors) || [],
      clients: (databaseMetaArray(databaseMeta, "clients") as typeof APP_DATA.database.clients) || [],
      templates: (databaseMetaArray(databaseMeta, "templates") as typeof APP_DATA.database.templates) || [],
    },
    business: {
      name: String(input.businessMeta.name || APP_DATA.business.name),
      accounts,
      totalKas: Number(input.businessMeta.totalKas ?? totalKas),
      modal: Number(input.businessMeta.modal ?? APP_DATA.business.modal),
      asetTetap: Number(input.businessMeta.asetTetap ?? APP_DATA.business.asetTetap),
      totalAktiva: Number(input.businessMeta.totalAktiva ?? APP_DATA.business.totalAktiva),
      totalHutang: Number(input.businessMeta.totalHutang ?? APP_DATA.business.totalHutang),
      ekuitas: Number(input.businessMeta.ekuitas ?? APP_DATA.business.ekuitas),
      labaDitahan: Number(input.businessMeta.labaDitahan ?? APP_DATA.business.labaDitahan),
      cashflowData: (input.businessMeta.cashflowData as number[]) || APP_DATA.business.cashflowData,
      cashflowOut: (input.businessMeta.cashflowOut as number[]) || APP_DATA.business.cashflowOut,
      cashflowMonths: (input.businessMeta.cashflowMonths as string[]) || APP_DATA.business.cashflowMonths,
      operational: (input.businessMeta.operational as typeof APP_DATA.business.operational) || APP_DATA.business.operational,
      assets: (input.businessMeta.assets as typeof APP_DATA.business.assets) || APP_DATA.business.assets,
      hutangList: (input.businessMeta.hutangList as typeof APP_DATA.business.hutangList) || APP_DATA.business.hutangList,
      piutangList: (input.businessMeta.piutangList as typeof APP_DATA.business.piutangList) || APP_DATA.business.piutangList,
    },
  };
}

function databaseMetaArray(meta: Record<string, unknown>, key: string) {
  const val = meta[key];
  return Array.isArray(val) ? val : undefined;
}

/**
 * Convert APP project to DB insert/update shape.
 */
export function projectToDbRow(project: AppProject) {
  return {
    name: project.name,
    client: project.client,
    type: project.type,
    startDate: new Date(project.startDate),
    endDate: new Date(project.endDate),
    contractValue: project.contractValue,
    saldo: project.saldo,
    status: project.status,
    progressPlan: project.progress.plan,
    progressActual: project.progress.actual,
    rapData: project.rap,
    timelineData: project.timeline,
    metadata: {
      duration: project.duration,
      categories: project.categories,
      products: project.products,
      budget: project.budget,
      hutangPiutang: project.hutangPiutang,
      progressDeviation: project.progress.deviation,
    },
  };
}

export function transactionsFromProject(project: AppProject) {
  const rows = [
    ...project.payments.map((p) => ({
      projectId: project.id,
      type: "in",
      category: "Pembayaran",
      name: p.name,
      amount: p.amount,
      date: new Date(p.date),
      time: p.time,
      icon: p.icon,
    })),
    ...project.expenses.map((e) => ({
      projectId: project.id,
      type: e.type,
      category: e.category,
      name: e.name,
      amount: e.amount,
      date: new Date(e.date),
      time: e.time,
      icon: e.icon,
    })),
  ];
  return rows;
}
