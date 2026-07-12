// Map planner_* rows → sandbox-compatible project view for balance sheet & V2 tabs.

export type MappedRapItem = {
  id: number;
  plannerId?: string;
  name: string;
  unit: string;
  unitPrice: number;
  qtyPlan: number;
  qtyActual: number;
  total: number;
  rapTotal: number;
  status: string;
  checked: boolean;
  vendor: string;
};

export type MappedProjectView = {
  id: string | number;
  name: string;
  client: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  contractValue: number;
  saldo: number;
  status: 'ok' | 'warning' | 'danger';
  progress: { plan: number; actual: number; deviation: number };
  rap: {
    totalRAP: number;
    realisasi: number;
    estLaba: number;
    materials: MappedRapItem[];
    workers: MappedRapItem[];
  };
  budget: {
    bahan: { plan: number; actual: number };
    tukang: { plan: number; actual: number };
    piutang: number;
    hutang: number;
  };
  payments: Array<{ id: number; type: 'in'; name: string; amount: number; date: string; time: string; icon: string }>;
  expenses: Array<{ id: number; type: 'out'; category: string; name: string; amount: number; date: string; time: string; icon: string }>;
  timeline: Array<{ id: number; name: string; weight: number; progress: number; planProgress: number; status: string; start: string; end: string }>;
  hutangPiutang: Array<{
    id: number;
    type: 'hutang' | 'piutang';
    name: string;
    /** Nama pihak lawan: vendor (hutang) atau klien (piutang) */
    partyName?: string;
    amount: number;
    due: string;
    status: string;
  }>;
};

export type PlannerProjectRow = {
  id: string;
  org_id: string;
  name: string;
  client_name?: string | null;
  planned_start: string;
  planned_end: string;
  status?: string | null;
  progress_pct?: string | number | null;
  total_budget?: string | number | null;
  total_spent?: string | number | null;
  total_received?: string | number | null;
  settings?: Record<string, unknown> | null;
};

export type PlannerRapRow = {
  id: string;
  project_id: string;
  type: string;
  name: string;
  unit: string;
  quantity: string | number;
  unit_price: string | number;
  supplier?: string | null;
  sort_order?: number | null;
};

export type PlannerCostRow = {
  id: string;
  project_id: string;
  rap_item_id?: string | null;
  date: string;
  description: string;
  quantity?: string | number | null;
  unit_price?: string | number | null;
  total_amount: string | number;
  supplier?: string | null;
};

export type PlannerIncomeRow = {
  id: string;
  project_id: string;
  date: string;
  amount: string | number;
  category: string;
  description: string;
  status: string;
};

export type PlannerWorkRow = {
  id: string;
  project_id: string;
  name: string;
  planned_start: string;
  planned_end: string;
  progress_pct?: string | number | null;
  weight?: string | number | null;
  status?: string | null;
};

type RapActualAgg = { qty: number; amount: number };

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function mapProjectStatus(
  status: string | null | undefined,
  spent: number,
  budget: number,
): MappedProjectView['status'] {
  if (status === 'paused' || status === 'cancelled') return 'danger';
  if (budget > 0 && spent / budget > 0.85) return 'warning';
  return 'ok';
}

function mapWorkStatus(status: string | null | undefined, progress: number): string {
  if (status === 'completed' || progress >= 100) return 'done';
  if (status === 'in_progress' || progress > 0) return 'active';
  return 'pending';
}

function rapStatus(qtyPlan: number, qtyActual: number, total: number, rapTotal: number): string {
  if (total <= 0 && qtyActual <= 0) return 'pending';
  if (total > rapTotal || qtyActual > qtyPlan) return 'over';
  return 'ok';
}

function buildActualByRapId(costs: PlannerCostRow[]): Map<string, RapActualAgg> {
  const map = new Map<string, RapActualAgg>();
  for (const cost of costs) {
    if (!cost.rap_item_id) continue;
    const agg = map.get(cost.rap_item_id) || { qty: 0, amount: 0 };
    const amount = num(cost.total_amount);
    let qty = num(cost.quantity);
    if (qty <= 0 && amount > 0) {
      const unitPrice = num(cost.unit_price);
      qty = unitPrice > 0 ? amount / unitPrice : 1;
    }
    agg.qty += qty;
    agg.amount += amount;
    map.set(cost.rap_item_id, agg);
  }
  return map;
}

function mapRapItem(row: PlannerRapRow, idx: number, actualByRapId: Map<string, RapActualAgg>): MappedRapItem {
  const qtyPlan = num(row.quantity);
  const unitPrice = num(row.unit_price);
  const rapTotal = qtyPlan * unitPrice;
  const agg = actualByRapId.get(row.id);
  const qtyActual = agg?.qty ?? 0;
  const total = agg?.amount ?? 0;
  return {
    id: idx + 1,
    plannerId: row.id,
    name: row.name,
    unit: row.unit,
    unitPrice,
    qtyPlan,
    qtyActual,
    total,
    rapTotal,
    status: rapStatus(qtyPlan, qtyActual, total, rapTotal),
    checked: qtyActual > 0,
    vendor: row.supplier || '',
  };
}

export function mapPlannerProject(input: {
  project: PlannerProjectRow;
  rapItems: PlannerRapRow[];
  costs: PlannerCostRow[];
  incomes: PlannerIncomeRow[];
  workItems: PlannerWorkRow[];
}): MappedProjectView {
  const p = input.project;
  const budget = num(p.total_budget);
  const spent = num(p.total_spent);
  const received = num(p.total_received);
  const progress = num(p.progress_pct);
  const settings = (p.settings || {}) as Record<string, string>;
  const actualByRapId = buildActualByRapId(input.costs);

  const materials = input.rapItems
    .filter(r => r.type === 'material')
    .map((r, idx) => mapRapItem(r, idx, actualByRapId));
  const workers = input.rapItems
    .filter(r => r.type === 'labor')
    .map((r, idx) => mapRapItem(r, idx, actualByRapId));

  const totalRap = [...materials, ...workers].reduce((s, item) => s + item.rapTotal, 0);
  const bahanPlan = materials.reduce((s, item) => s + item.rapTotal, 0);
  const tukangPlan = workers.reduce((s, item) => s + item.rapTotal, 0);
  const bahanActual = materials.reduce((s, item) => s + item.total, 0);
  const tukangActual = workers.reduce((s, item) => s + item.total, 0);

  const payments = input.incomes
    .filter(i => i.status === 'received')
    .map((inc, idx) => ({
      id: idx + 1,
      type: 'in' as const,
      name: inc.description || `Pembayaran ${inc.category}`,
      amount: num(inc.amount),
      date: dateOnly(inc.date),
      time: '00:00',
      icon: 'arrow-down-circle',
    }));

  const expenses = input.costs.map((cost, idx) => ({
    id: idx + 1,
    type: 'out' as const,
    category: 'Biaya',
    name: cost.description,
    amount: num(cost.total_amount),
    date: dateOnly(cost.date),
    time: '00:00',
    icon: 'arrow-up-circle',
  }));

  const timeline = input.workItems.map((w, idx) => {
    const prog = num(w.progress_pct);
    return {
      id: idx + 1,
      name: w.name,
      weight: num(w.weight, 10),
      progress: prog,
      planProgress: progress,
      status: mapWorkStatus(w.status, prog),
      start: dateOnly(w.planned_start),
      end: dateOnly(w.planned_end),
    };
  });

  const start = dateOnly(p.planned_start);
  const end = dateOnly(p.planned_end);
  const estLaba = Math.max(0, budget - spent);
  const piutang = Math.max(0, budget - received);
  const hutang = Math.max(0, spent - received);
  const saldo = received - spent;

  const hutangPiutang: MappedProjectView['hutangPiutang'] = buildHutangPiutangList({
    costs: input.costs,
    hutang,
    spent,
    piutang,
    clientName: p.client_name || 'Klien',
    end,
  });

  return {
    id: p.id,
    name: p.name,
    client: p.client_name || '-',
    type: settings.type || 'Konstruksi',
    startDate: start,
    endDate: end,
    duration: daysBetween(start, end),
    contractValue: budget,
    saldo,
    status: mapProjectStatus(p.status, spent, budget),
    progress: { plan: progress, actual: progress, deviation: 0 },
    rap: {
      totalRAP: totalRap,
      realisasi: spent,
      estLaba,
      materials,
      workers,
    },
    budget: {
      bahan: { plan: bahanPlan, actual: bahanActual },
      tukang: { plan: tukangPlan, actual: tukangActual },
      piutang,
      hutang,
    },
    payments,
    expenses,
    timeline,
    hutangPiutang,
  };
}

const GENERIC_VENDOR = /^(import|vendor|realisasi|biaya|umum)$/i;

function isRealVendorName(supplier: string, description: string): boolean {
  const s = supplier.trim();
  if (!s || GENERIC_VENDOR.test(s)) return false;
  const d = description.trim();
  if (d && s.toLowerCase() === d.toLowerCase()) return false;
  if (d && d.toLowerCase().startsWith('realisasi') && !s.includes(' ')) return false;
  return true;
}

/**
 * Build hutang/piutang list with clear counterparty names (bukan deskripsi biaya).
 */
function buildHutangPiutangList(input: {
  costs: PlannerCostRow[];
  hutang: number;
  spent: number;
  piutang: number;
  clientName: string;
  end: string;
}): MappedProjectView['hutangPiutang'] {
  const items: MappedProjectView['hutangPiutang'] = [];
  let id = 1;

  if (input.hutang > 0) {
    const vendorTotals = new Map<string, number>();
    for (const cost of input.costs) {
      const supplier = cost.supplier?.trim() || '';
      if (!isRealVendorName(supplier, cost.description || '')) continue;
      vendorTotals.set(supplier, (vendorTotals.get(supplier) || 0) + num(cost.total_amount));
    }

    if (vendorTotals.size > 0 && input.spent > 0) {
      for (const [vendor, vendorSpent] of vendorTotals) {
        const share = Math.round(input.hutang * (vendorSpent / input.spent));
        if (share <= 0) continue;
        items.push({
          id: id++,
          type: 'hutang',
          name: `Hutang ke ${vendor}`,
          partyName: vendor,
          amount: share,
          due: input.end,
          status: 'upcoming',
        });
      }
    }

    const listed = items.reduce((s, h) => s + h.amount, 0);
    const remainder = input.hutang - listed;
    if (remainder > 0 || items.length === 0) {
      items.push({
        id: id++,
        type: 'hutang',
        name: 'Hutang Operasional',
        partyName: 'Vendor / Pinjaman',
        amount: remainder > 0 ? remainder : input.hutang,
        due: input.end,
        status: 'upcoming',
      });
    }
  }

  if (input.piutang > 0) {
    items.push({
      id: id++,
      type: 'piutang',
      name: `Piutang dari ${input.clientName}`,
      partyName: input.clientName,
      amount: input.piutang,
      due: input.end,
      status: 'upcoming',
    });
  }

  return items;
}
