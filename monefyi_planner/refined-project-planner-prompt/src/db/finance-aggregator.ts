import { getSupabaseAdmin } from "./supabase-admin";
import { APP_DATA } from "@/lib/mock-data";

function getPlannerOrgId(): string {
  return process.env.PLANNER_ORG_ID || "072144fe-05e4-45c4-9138-61a62cdb18f8";
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type FinanceAccountRow = {
  id: string;
  type: string;
  category: string;
  name: string;
  current_balance: string | number;
};

type OpexRow = { amount: unknown; paid_date: unknown; category_id: unknown };
type InventoryRow = { name: unknown; unit: unknown; qty: unknown; unit_cost: unknown };
type ProjectFinanceRow = { id: unknown; total_received: unknown; total_spent: unknown };

async function safeQuery<T>(
  query: PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>
): Promise<{ data: T; error: null } | { data: T; error: { code?: string } | null }> {
  try {
    const res = await query;
    if (res.error?.code === "42P01") return { data: [] as T, error: null };
    return res as { data: T; error: null };
  } catch {
    return { data: [] as T, error: null };
  }
}

/**
 * Aggregate org-level finance metrics from planner_finance_* tables.
 */
export async function aggregatePlannerFinance(orgId?: string) {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const oid = orgId || getPlannerOrgId();

  const [accountsRes, opexRes, inventoryRes, projectsRes] = await Promise.all([
    client
      .from("planner_finance_accounts")
      .select("id, type, category, name, current_balance")
      .eq("org_id", oid)
      .eq("is_active", true),
    safeQuery<OpexRow[]>(
      client
        .from("planner_opex_realizations")
        .select("amount, paid_date, category_id")
        .eq("org_id", oid)
        .order("paid_date", { ascending: false })
        .limit(50)
    ),
    safeQuery<InventoryRow[]>(
      client
        .from("planner_inventory_items")
        .select("name, unit, qty, unit_cost")
        .eq("org_id", oid)
    ),
    client
      .from("planner_projects")
      .select("id, total_received, total_spent")
      .eq("org_id", oid)
      .is("deleted_at", null),
  ]);

  if (accountsRes.error) {
    if (accountsRes.error.code === "42P01") return null;
    throw accountsRes.error;
  }

  const accounts = (accountsRes.data || []) as FinanceAccountRow[];
  if (!accounts.length) return null;

  const kasAccounts = accounts
    .filter((a) => a.type === "kas")
    .map((a, idx) => ({
      id: idx + 1,
      name: a.name,
      balance: num(a.current_balance),
      icon: "landmark" as const,
    }));

  const totalKas = kasAccounts.reduce((s, a) => s + a.balance, 0);
  const hutangAccounts = accounts.filter((a) => a.type.startsWith("hutang"));
  const piutangAccounts = accounts.filter((a) => a.type === "piutang");

  const totalHutang = hutangAccounts.reduce((s, a) => s + num(a.current_balance), 0);
  const totalPiutang = piutangAccounts.reduce((s, a) => s + num(a.current_balance), 0);

  const asetTetapOnly = accounts
    .filter((a) => a.type === "aset_tetap")
    .reduce((s, a) => s + num(a.current_balance), 0);
  const stokAccounts = accounts
    .filter((a) => a.type === "stok")
    .reduce((s, a) => s + num(a.current_balance), 0);
  const prabayar = accounts
    .filter((a) => a.type === "prabayar")
    .reduce((s, a) => s + num(a.current_balance), 0);

  const modal = accounts
    .filter((a) => a.type === "modal_disetor")
    .reduce((s, a) => s + num(a.current_balance), 0);
  const labaDitahan = accounts
    .filter((a) => a.type === "laba_ditahan" || a.type === "laba")
    .reduce((s, a) => s + num(a.current_balance), 0);

  const inventoryFromItems = (inventoryRes.data || []).reduce(
    (s: number, row: InventoryRow) => s + num(row.qty) * num(row.unit_cost),
    0
  );
  // Prefer inventory items; fallback to stok accounts (never both)
  const persediaan = inventoryFromItems > 0 ? inventoryFromItems : stokAccounts;
  const asetTetap = asetTetapOnly;

  const projectIncome = (projectsRes.data || []).reduce(
    (s: number, p: ProjectFinanceRow) => s + num(p.total_received),
    0
  );
  const projectSpent = (projectsRes.data || []).reduce(
    (s: number, p: ProjectFinanceRow) => s + num(p.total_spent),
    0
  );

  const opexActual = (opexRes.data || []).reduce(
    (s: number, row: OpexRow) => s + num(row.amount),
    0
  );

  const hutangList = hutangAccounts.map((a, idx) => ({
    id: idx + 1,
    name: a.name,
    amount: num(a.current_balance),
    due: new Date().toISOString().slice(0, 10),
    category: a.type,
    icon: "receipt" as const,
  }));

  const piutangList = piutangAccounts.map((a, idx) => ({
    id: idx + 1,
    name: a.name,
    amount: num(a.current_balance),
    due: new Date().toISOString().slice(0, 10),
    category: "Klien",
    icon: "file-check" as const,
  }));

  const assets = (inventoryRes.data || []).map((row: InventoryRow, idx: number) => ({
    id: idx + 1,
    name: String(row.name),
    condition: "Baik",
    value: Math.round(num(row.qty) * num(row.unit_cost)),
    assignedTo: null as string | null,
    icon: "package" as const,
  }));

  const totalAktiva = totalKas + totalPiutang + persediaan + asetTetap + prabayar;
  const ekuitas = modal + labaDitahan;
  const totalPasivaEkuitas = totalHutang + ekuitas;

  const now = new Date();
  const cashflowMonths: string[] = [];
  const cashflowData: number[] = [];
  const cashflowOut: number[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    cashflowMonths.push(monthNames[d.getMonth()]);
    const factor = 0.85 + (5 - i) * 0.03;
    cashflowData.push(Math.round(projectIncome / 6 * factor));
    cashflowOut.push(Math.round((projectSpent + opexActual) / 6 * factor));
  }

  return {
    accounts: kasAccounts,
    totalKas,
    modal,
    asetTetap,
    persediaan,
    prabayar,
    totalAktiva,
    totalHutang,
    ekuitas,
    labaDitahan,
    cashflowData,
    cashflowOut,
    cashflowMonths,
    operational: APP_DATA.business.operational.map((o, idx) => ({
      ...o,
      actual: idx === 0 ? Math.round(opexActual / 6) : o.actual,
    })),
    assets: assets.length ? assets : [],
    hutangList,
    piutangList,
    _meta: {
      projectIncome,
      projectSpent,
      opexActual,
      hasRealAccounts: true,
      inventoryFromItems: inventoryFromItems > 0,
      stokAccounts,
      totalPasivaEkuitas,
    },
  };
}
