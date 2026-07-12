import type {
  projects,
  transactions,
  materials,
  workers,
  businessAccounts,
  appConfig,
} from "./schema";

type DbProject = typeof projects.$inferSelect;
type DbTransaction = typeof transactions.$inferSelect;
type DbMaterial = typeof materials.$inferSelect;
type DbWorker = typeof workers.$inferSelect;
type DbAccount = typeof businessAccounts.$inferSelect;
type DbAppConfig = typeof appConfig.$inferSelect;

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dateValue(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

export function normalizeProjectRow(row: Record<string, unknown>): DbProject {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    client: String(row.client ?? ""),
    type: String(row.type ?? ""),
    startDate: dateValue(row.start_date ?? row.startDate),
    endDate: dateValue(row.end_date ?? row.endDate),
    contractValue: num(row.contract_value ?? row.contractValue),
    saldo: num(row.saldo),
    status: String(row.status ?? "ok"),
    progressPlan: num(row.progress_plan ?? row.progressPlan),
    progressActual: num(row.progress_actual ?? row.progressActual),
    rapData: (row.rap_data ?? row.rapData ?? null) as DbProject["rapData"],
    timelineData: (row.timeline_data ?? row.timelineData ?? null) as DbProject["timelineData"],
    metadata: (row.metadata ?? null) as DbProject["metadata"],
  };
}

export function normalizeTransactionRow(row: Record<string, unknown>): DbTransaction {
  return {
    id: num(row.id),
    projectId: row.project_id != null || row.projectId != null
      ? num(row.project_id ?? row.projectId)
      : null,
    type: String(row.type ?? ""),
    category: String(row.category ?? ""),
    name: String(row.name ?? ""),
    amount: num(row.amount),
    date: dateValue(row.date),
    time: row.time != null ? String(row.time) : null,
    icon: row.icon != null ? String(row.icon) : null,
    note: row.note != null ? String(row.note) : null,
  };
}

export function normalizeMaterialRow(row: Record<string, unknown>): DbMaterial {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    category: String(row.category ?? ""),
    unit: String(row.unit ?? ""),
    price: num(row.price),
    lastPrice: row.last_price != null || row.lastPrice != null
      ? num(row.last_price ?? row.lastPrice)
      : null,
    trend: row.trend != null ? String(row.trend) : null,
    stock: row.stock != null ? String(row.stock) : null,
    usedIn: row.used_in != null || row.usedIn != null
      ? num(row.used_in ?? row.usedIn)
      : null,
    icon: row.icon != null ? String(row.icon) : null,
    vendor: row.vendor != null ? String(row.vendor) : null,
  };
}

export function normalizeWorkerRow(row: Record<string, unknown>): DbWorker {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    level: String(row.level ?? ""),
    rate: num(row.rate),
    contact: row.contact != null ? String(row.contact) : null,
    rating: row.rating != null ? num(row.rating, 5) : null,
  };
}

export function normalizeAccountRow(row: Record<string, unknown>): DbAccount {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    balance: num(row.balance),
    icon: row.icon != null ? String(row.icon) : null,
  };
}

export function normalizeConfigRow(row: Record<string, unknown>): DbAppConfig {
  return {
    key: String(row.key ?? ""),
    payload: (row.payload ?? {}) as DbAppConfig["payload"],
  };
}

export function projectToSupabaseRow(project: ReturnType<typeof import("@/lib/db-mapper").projectToDbRow>) {
  return {
    name: project.name,
    client: project.client,
    type: project.type,
    start_date: project.startDate.toISOString(),
    end_date: project.endDate.toISOString(),
    contract_value: project.contractValue,
    saldo: project.saldo,
    status: project.status,
    progress_plan: project.progressPlan,
    progress_actual: project.progressActual,
    rap_data: project.rapData,
    timeline_data: project.timelineData,
    metadata: project.metadata,
  };
}

export function transactionToSupabaseRow(tx: {
  projectId: number;
  type: string;
  category: string;
  name: string;
  amount: number;
  date: Date;
  time?: string;
  icon?: string;
  note?: string;
}) {
  return {
    project_id: tx.projectId,
    type: tx.type,
    category: tx.category,
    name: tx.name,
    amount: tx.amount,
    date: tx.date.toISOString(),
    time: tx.time,
    icon: tx.icon,
    note: tx.note,
  };
}
