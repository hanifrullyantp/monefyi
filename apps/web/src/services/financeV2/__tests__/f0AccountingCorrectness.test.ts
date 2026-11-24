import { beforeEach, describe, expect, it, vi } from 'vitest';

type TableRow = Record<string, unknown>;

interface MockDbState {
  projects: TableRow[];
  accounts: TableRow[];
  journalEntries: TableRow[];
  journalLines: TableRow[];
  costRealizations: TableRow[];
  projectIncomes: TableRow[];
  receivables: TableRow[];
  payables: TableRow[];
  investors: TableRow[];
  investorTxs: TableRow[];
  periodSnapshots: TableRow[];
  opexCategories: TableRow[];
  opexRealizations: TableRow[];
}

function createInitialDb(): MockDbState {
  return {
    projects: [
      {
        id: 'proj-1',
        org_id: 'org-1',
        name: 'Rumah Pak Budi',
        total_budget: 50_000_000,
        total_spent: 17_000_000,
        total_received: 30_200_000,
        finance_status: 'active',
        settings: {
          contract_value: 30_200_000,
          dividend: {
            parties: [
              { id: 'p-owner', name: 'Hanif', sharePct: 50, isOwner: true },
              { id: 'p-partner', name: 'Mitra', sharePct: 50, isOwner: false },
            ],
            payouts: [],
          },
        },
      },
    ],
    accounts: [
      { id: 'acc-kas-bisnis', org_id: 'org-1', type: 'kas', category: 'aktiva', name: 'Kas Bisnis', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
      { id: 'acc-kas-proj', org_id: 'org-1', type: 'kas', category: 'aktiva', name: 'Kas Rumah Pak Budi', project_id: 'proj-1', parent_id: null, is_system: false, is_active: true, current_balance: 13_200_000, metadata: {}, created_at: '', updated_at: '' },
      { id: 'acc-piutang', org_id: 'org-1', type: 'piutang', category: 'aktiva', name: 'Piutang Usaha', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 1_787_000, metadata: {}, created_at: '', updated_at: '' },
      { id: 'acc-hutang', org_id: 'org-1', type: 'hutang_dagang', category: 'pasiva', name: 'Hutang Dagang', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
      { id: 'acc-modal', org_id: 'org-1', type: 'modal_disetor', category: 'pasiva', name: 'Modal Disetor', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
      { id: 'acc-laba-ditahan', org_id: 'org-1', type: 'laba_ditahan', category: 'pasiva', name: 'Laba Ditahan', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
      { id: 'acc-laba', org_id: 'org-1', type: 'laba', category: 'pasiva', name: 'Laba Periode Berjalan', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 13_200_000, metadata: {}, created_at: '', updated_at: '' },
    ],
    journalEntries: [],
    journalLines: [],
    costRealizations: [],
    projectIncomes: [],
    receivables: [
      {
        id: 'rec-owner-1',
        org_id: 'org-1',
        debtor_type: 'person',
        debtor_name: 'Hanif',
        debtor_project_id: 'proj-1',
        amount: 1_787_000,
        paid_amount: 0,
        due_date: null,
        status: 'open',
        notes: null,
        created_at: '',
      },
    ],
    payables: [],
    investors: [],
    investorTxs: [],
    periodSnapshots: [],
    opexCategories: [],
    opexRealizations: [],
  };
}

let db: MockDbState;
let seq = 1;

function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

function tableFor(name: string): TableRow[] {
  switch (name) {
    case 'planner_projects': return db.projects;
    case 'planner_finance_accounts': return db.accounts;
    case 'planner_journal_entries': return db.journalEntries;
    case 'planner_journal_lines': return db.journalLines;
    case 'planner_cost_realizations': return db.costRealizations;
    case 'planner_project_incomes': return db.projectIncomes;
    case 'planner_receivables': return db.receivables;
    case 'planner_payables': return db.payables;
    case 'planner_investors': return db.investors;
    case 'planner_investor_transactions': return db.investorTxs;
    case 'planner_finance_period_snapshots': return db.periodSnapshots;
    case 'planner_opex_categories': return db.opexCategories;
    case 'planner_opex_realizations': return db.opexRealizations;
    default: return [];
  }
}

function createQueryBuilder(table: string) {
  const filters: Array<(row: TableRow) => boolean> = [];
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  let payload: TableRow | TableRow[] | null = null;
  let headCount = false;

  const applyFilters = (rows: TableRow[]) => rows.filter((r) => filters.every((fn) => fn(r)));

  const exec = async (): Promise<{ data: unknown; error: { message: string; code?: string } | null; count?: number }> => {
    const rows = tableFor(table);
    if (op === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload!];
      const inserted = items.map((item) => {
        const row = { id: item.id || nextId(table.slice(0, 6)), created_at: '2026-11-24T00:00:00Z', ...item };
        rows.push(row);
        return row;
      });
      return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
    }
    if (op === 'update') {
      const matched = applyFilters(rows);
      for (const r of matched) Object.assign(r, payload);
      return { data: matched, error: null };
    }
    if (op === 'delete') {
      const matched = new Set(applyFilters(rows));
      const remaining = rows.filter((r) => !matched.has(r));
      rows.length = 0;
      rows.push(...remaining);
      return { data: [...matched], error: null };
    }
    const matched = applyFilters(rows);
    if (headCount) {
      return { data: null, count: matched.length, error: null };
    }
    return { data: matched, error: null };
  };

  const builder: Record<string, unknown> = {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.head) headCount = true;
      return builder;
    },
    insert(data: TableRow | TableRow[]) {
      op = 'insert';
      payload = data;
      return builder;
    },
    update(data: TableRow) {
      op = 'update';
      payload = data;
      return builder;
    },
    delete() {
      op = 'delete';
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push((r) => r[col] === val);
      return builder;
    },
    neq(col: string, val: unknown) {
      filters.push((r) => r[col] !== val);
      return builder;
    },
    in(col: string, vals: unknown[]) {
      filters.push((r) => vals.includes(r[col]));
      return builder;
    },
    is(col: string, val: unknown) {
      filters.push((r) => (val === null ? r[col] == null : r[col] === val));
      return builder;
    },
    not(col: string, operator: string, val: unknown) {
      if (operator === 'is' && val === null) filters.push((r) => r[col] != null);
      return builder;
    },
    gte(col: string, val: string) {
      filters.push((r) => String(r[col] ?? '') >= val);
      return builder;
    },
    lte(col: string, val: string) {
      filters.push((r) => String(r[col] ?? '') <= val);
      return builder;
    },
    lt(col: string, val: string) {
      filters.push((r) => String(r[col] ?? '') < val);
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    async single() {
      const res = await exec();
      if (res.error) return res;
      const arr = Array.isArray(res.data) ? res.data : [res.data];
      if (!arr[0]) return { data: null, error: { message: 'Not found' } };
      return { data: arr[0], error: null };
    },
    async maybeSingle() {
      const res = await exec();
      if (res.error) return res;
      const arr = Array.isArray(res.data) ? res.data : [res.data];
      return { data: arr[0] ?? null, error: null };
    },
    then(onFulfilled?: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
      return exec().then(onFulfilled, onRejected);
    },
  };

  return builder;
}

const mockRpc = vi.fn(async (fn: string, params: Record<string, unknown>) => {
  if (fn === 'seed_default_chart_of_accounts') return { data: null, error: null };
  if (fn === 'planner_post_journal') {
    const lines = (params.p_lines as Array<{ account_id: string; debit: number; credit: number; notes?: string }>) || [];
    const sumD = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const sumC = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (sumD !== sumC || sumD <= 0) return { data: null, error: { message: 'jurnal_tidak_seimbang' } };
    const id = nextId('jrn');
    db.journalEntries.push({
      id,
      org_id: params.p_org_id,
      entry_date: params.p_entry_date,
      description: params.p_description,
      reference_type: params.p_reference_type,
      reference_id: params.p_reference_id,
      total_amount: sumD,
      created_by: params.p_created_by,
      created_at: '2026-11-24T00:00:00Z',
    });
    for (const l of lines) {
      db.journalLines.push({
        id: nextId('jl'),
        journal_id: id,
        account_id: l.account_id,
        debit: l.debit,
        credit: l.credit,
        notes: l.notes ?? null,
      });
      const acc = db.accounts.find((a) => a.id === l.account_id);
      if (acc) {
        const delta = acc.category === 'aktiva' ? l.debit - l.credit : l.credit - l.debit;
        acc.current_balance = Number(acc.current_balance) + delta;
      }
    }
    return { data: id, error: null };
  }
  return { data: null, error: { message: 'unknown rpc', code: 'PGRST202' } };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => createQueryBuilder(table),
    rpc: (...args: unknown[]) => mockRpc(args[0] as string, args[1] as Record<string, unknown>),
  },
}));

import { recordDividendPayouts } from '../projectDividendService';
import { backfillProjectJournalsForOrg } from '../projectJournalBridge';
import { getFinanceIntegrationStatus } from '../financeIntegrationService';

describe('F0-T1: Dividen proyek sebagai jurnal ekuitas, bukan biaya proyek', () => {
  beforeEach(() => {
    seq = 1;
    db = createInitialDb();
    mockRpc.mockClear();
  });

  it('recordDividendPayouts tidak menulis ke planner_cost_realizations dan memposting jurnal ekuitas (kas & offset piutang)', async () => {
    const kasBefore = Number(db.accounts.find((a) => a.id === 'acc-kas-proj')!.current_balance);
    const piutangBefore = Number(db.accounts.find((a) => a.id === 'acc-piutang')!.current_balance);

    await recordDividendPayouts({
      orgId: 'org-1',
      projectId: 'proj-1',
      userId: 'user-1',
      received: 30_200_000,
      spent: 17_000_000,
      contractValue: 30_200_000,
    });

    // Tidak boleh menulis baris biaya ke planner_cost_realizations
    expect(db.costRealizations).toHaveLength(0);

    // Harus ada jurnal bertipe dividend untuk kas keluar & offset piutang owner
    const dividendJournals = db.journalEntries.filter((j) => j.reference_type === 'dividend');
    expect(dividendJournals.length).toBeGreaterThanOrEqual(2);

    // Saldo kas proyek berkurang sebesar total kas dividen (13.200.000 - 1.787.000 = 11.413.000)
    const kasAfter = Number(db.accounts.find((a) => a.id === 'acc-kas-proj')!.current_balance);
    expect(kasBefore - kasAfter).toBe(11_413_000);

    // Saldo piutang berkurang sebesar offset piutang owner (1.787.000)
    const piutangAfter = Number(db.accounts.find((a) => a.id === 'acc-piutang')!.current_balance);
    expect(piutangBefore - piutangAfter).toBe(1_787_000);

    // Saldo Laba Ditahan berkurang (didebit) sebesar total dividen 13.200.000
    const labaDitahan = Number(db.accounts.find((a) => a.id === 'acc-laba-ditahan')!.current_balance);
    expect(labaDitahan).toBe(-13_200_000);

    // Setiap jurnal harus seimbang (Debit == Kredit)
    for (const entry of db.journalEntries) {
      const lines = db.journalLines.filter((l) => l.journal_id === entry.id);
      const sumD = lines.reduce((s, l) => s + Number(l.debit), 0);
      const sumC = lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(sumD).toBe(sumC);
      expect(sumD).toBeGreaterThan(0);
    }
  });

  it('backfillProjectJournalsForOrg dan status integrasi mengabaikan baris status dividend & cancelled', async () => {
    db.costRealizations.push(
      {
        id: 'cost-div-legacy',
        project_id: 'proj-1',
        date: '2026-11-20',
        description: 'Dividen: Hanif',
        total_amount: 5_000_000,
        status: 'dividend',
        journal_entry_id: null,
      },
      {
        id: 'cost-cancel-legacy',
        project_id: 'proj-1',
        date: '2026-11-20',
        description: 'Batal semen',
        total_amount: 500_000,
        status: 'cancelled',
        journal_entry_id: null,
      },
    );

    const status = await getFinanceIntegrationStatus('org-1');
    expect(status.unsyncedCosts).toBe(0);

    const res = await backfillProjectJournalsForOrg('org-1', 'user-1');
    expect(res.costsPosted).toBe(0);
    expect(db.journalEntries.filter((j) => j.reference_type === 'project_expense')).toHaveLength(0);
  });
});

