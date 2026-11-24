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
  projectTransfers: TableRow[];
  reportRuns: TableRow[];
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
    projectTransfers: [],
    reportRuns: [],
  };
}

let db: MockDbState;
let seq = 1;
let forceJournalFailure = false;

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
    case 'planner_project_transfers': return db.projectTransfers;
    case 'planner_finance_report_runs': return db.reportRuns;
    default: return [];
  }
}

function createQueryBuilder(table: string) {
  const filters: Array<(row: TableRow) => boolean> = [];
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  let payload: TableRow | TableRow[] | null = null;
  let headCount = false;
  let selectStr = '*';

  const applyFilters = (rows: TableRow[]) => rows.filter((r) => filters.every((fn) => fn(r)));

  const enrichRow = (row: TableRow): TableRow => {
    if (table === 'planner_journal_entries' && selectStr.includes('planner_journal_lines')) {
      const lines = db.journalLines
        .filter((l) => l.journal_id === row.id)
        .map((l) => ({
          ...l,
          account: db.accounts.find((a) => a.id === l.account_id) || null,
        }));
      return { ...row, lines };
    }
    return row;
  };

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
    const matched = applyFilters(rows).map(enrichRow);
    if (headCount) {
      return { data: null, count: matched.length, error: null };
    }
    return { data: matched, error: null };
  };

  const builder: Record<string, unknown> = {
    select(cols?: string, opts?: { count?: string; head?: boolean }) {
      if (cols) selectStr = cols;
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
    or(expr: string) {
      const parts = expr.split(',').map((p) => p.trim());
      filters.push((r) =>
        parts.some((p) => {
          const [col, cmp, val] = p.split('.');
          if (cmp === 'eq') return String(r[col] ?? '') === val;
          return false;
        }),
      );
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
    if (forceJournalFailure) {
      return { data: null, error: { message: 'simulasi_gagal_jurnal' } };
    }
    const lines = (params.p_lines as Array<{ account_id: string; debit: number; credit: number; notes?: string }>) || [];
    const sumD = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const sumC = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (sumD !== sumC || sumD <= 0) return { data: null, error: { message: 'jurnal_tidak_seimbang' } };
    if (params.p_reference_id) {
      const existing = db.journalEntries.find(
        (e) =>
          e.org_id === params.p_org_id
          && e.reference_type === params.p_reference_type
          && e.reference_id === params.p_reference_id
          && !db.journalEntries.some((rev) => rev.reference_type === 'reversal' && rev.reference_id === e.id),
      );
      if (existing) return { data: existing.id, error: null };
    }
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
import { closeProjectFinance } from '../kasService';
import { closeFinancePeriod } from '../periodCloseService';
import { buildProfitLossReport } from '../../../lib/financeV2/reports/profitLossReport';
import { createJournalEntry } from '../journalService';
import { createProjectIncome, deleteProjectIncome, loadProjectIncomes } from '../../incomeService';
import {
  createCostRealization,
  deleteCostRealization,
  loadCostRealizations,
  updateCostRealization,
} from '../../costService';

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

describe('F0-T2 & F0-T5: Laba tidak terhitung dua kali & HPP berbasis akun/jenis', () => {
  beforeEach(() => {
    seq = 1;
    db = createInitialDb();
    // Reset saldo awal proyek bersih untuk skenario T2 & T5
    db.receivables = [];
    db.projects[0].total_received = 100_000_000;
    db.projects[0].total_spent = 60_000_000;
    db.accounts.find((a) => a.id === 'acc-kas-proj')!.current_balance = 0;
    db.accounts.find((a) => a.id === 'acc-piutang')!.current_balance = 0;
    db.accounts.find((a) => a.id === 'acc-laba')!.current_balance = 0;
    db.accounts.find((a) => a.id === 'acc-laba-ditahan')!.current_balance = 0;
    mockRpc.mockClear();
  });

  it('T5: biaya proyek tanpa kata "stok" di deskripsi masuk ke HPP, bukan otherExpense', async () => {
    await createJournalEntry({
      orgId: 'org-1',
      entryDate: '2026-11-05',
      description: 'Termin 1 klien',
      referenceType: 'project_income',
      referenceId: 'inc-1',
      lines: [
        { accountId: 'acc-kas-proj', debit: 100_000_000, credit: 0, projectId: 'proj-1' },
        { accountId: 'acc-laba', debit: 0, credit: 100_000_000, projectId: 'proj-1' },
      ],
    });
    await createJournalEntry({
      orgId: 'org-1',
      entryDate: '2026-11-10',
      description: 'Biaya proyek: Beli semen 10 sak & upah tukang',
      referenceType: 'project_expense',
      referenceId: 'cost-1',
      lines: [
        { accountId: 'acc-laba', debit: 60_000_000, credit: 0, projectId: 'proj-1' },
        { accountId: 'acc-kas-proj', debit: 0, credit: 60_000_000, projectId: 'proj-1' },
      ],
    });

    const pl = await buildProfitLossReport(
      { orgId: 'org-1', dateFrom: '2026-11-01', dateTo: '2026-11-30' },
      {
        projectNames: { 'proj-1': 'Rumah Pak Budi' },
        opexCategoryNames: {},
        receivableProjectMap: {},
        opexRealizationCategory: {},
      },
    );

    expect(pl.revenue).toBe(100_000_000);
    expect(pl.hpp).toBe(60_000_000);
    expect(pl.otherExpense).toBe(0);
    expect(pl.grossProfit).toBe(40_000_000);
    expect(pl.netProfit).toBe(40_000_000);
  });

  it('T2: closeProjectFinance lalu closeFinancePeriod memindahkan laba hanya sekali (saldo Laba Periode = 0, Laba Ditahan = 40jt)', async () => {
    await createJournalEntry({
      orgId: 'org-1',
      entryDate: '2026-11-05',
      description: 'Termin 1 klien',
      referenceType: 'project_income',
      referenceId: 'inc-1',
      lines: [
        { accountId: 'acc-kas-proj', debit: 100_000_000, credit: 0, projectId: 'proj-1' },
        { accountId: 'acc-laba', debit: 0, credit: 100_000_000, projectId: 'proj-1' },
      ],
    });
    await createJournalEntry({
      orgId: 'org-1',
      entryDate: '2026-11-10',
      description: 'Biaya proyek: Beli material',
      referenceType: 'project_expense',
      referenceId: 'cost-1',
      lines: [
        { accountId: 'acc-laba', debit: 60_000_000, credit: 0, projectId: 'proj-1' },
        { accountId: 'acc-kas-proj', debit: 0, credit: 60_000_000, projectId: 'proj-1' },
      ],
    });

    await closeProjectFinance({
      orgId: 'org-1',
      projectId: 'proj-1',
      createdBy: 'user-1',
    });

    await closeFinancePeriod({
      orgId: 'org-1',
      periodMonth: '2026-11-01',
      closedBy: 'user-1',
    });

    const plAfterClose = await buildProfitLossReport(
      { orgId: 'org-1', dateFrom: '2026-11-01', dateTo: '2026-11-30' },
      {
        projectNames: { 'proj-1': 'Rumah Pak Budi' },
        opexCategoryNames: {},
        receivableProjectMap: {},
        opexRealizationCategory: {},
      },
    );

    expect(plAfterClose.netProfit).toBe(40_000_000);
    expect(plAfterClose.otherExpense).toBe(0);

    const labaDitahan = Number(db.accounts.find((a) => a.id === 'acc-laba-ditahan')!.current_balance);
    const labaPeriode = Number(db.accounts.find((a) => a.id === 'acc-laba')!.current_balance);

    // Laba hanya pindah satu kali ke Laba Ditahan (40jt, bukan 80jt)
    expect(labaDitahan).toBe(40_000_000);
    // Saldo Laba Periode setelah tutup periode = 0
    expect(labaPeriode).toBe(0);
  });
});

describe('F0-T3 & F0-T4: Posting atomik, tanpa penelan error, edit=pembalik+baru, hapus=soft-delete+pembalik', () => {
  beforeEach(() => {
    seq = 1;
    forceJournalFailure = false;
    db = createInitialDb();
    db.accounts.find((a) => a.id === 'acc-kas-proj')!.current_balance = 0;
    db.accounts.find((a) => a.id === 'acc-laba')!.current_balance = 0;
    mockRpc.mockClear();
  });

  it('T3: createProjectIncome melempar error dan membatalkan baris sumber jika posting jurnal gagal', async () => {
    forceJournalFailure = true;

    await expect(
      createProjectIncome({
        project_id: 'proj-1',
        date: '2026-11-24',
        amount: 10_000_000,
        category: 'dp',
        description: 'DP Proyek',
        status: 'received',
        recorded_by: 'user-1',
      }),
    ).rejects.toThrow();

    expect(db.projectIncomes).toHaveLength(0);
    expect(db.journalEntries).toHaveLength(0);
  });

  it('T3: createCostRealization melempar error dan membatalkan baris sumber jika posting jurnal gagal', async () => {
    forceJournalFailure = true;

    await expect(
      createCostRealization({
        project_id: 'proj-1',
        date: '2026-11-24',
        description: 'Beli semen',
        total_amount: 500_000,
        recorded_by: 'user-1',
        status: 'recorded',
      }),
    ).rejects.toThrow();

    expect(db.costRealizations).toHaveLength(0);
    expect(db.journalEntries).toHaveLength(0);
  });

  it('T4: updateCostRealization membalik jurnal lama dan memposting jurnal baru dengan nominal baru', async () => {
    const created = await createCostRealization({
      project_id: 'proj-1',
      date: '2026-11-24',
      description: 'Beli pasir',
      total_amount: 500_000,
      recorded_by: 'user-1',
      status: 'recorded',
    });

    const firstJournalId = db.costRealizations[0].journal_entry_id as string;
    expect(firstJournalId).toBeTruthy();

    await updateCostRealization(created.id, 'proj-1', {
      total_amount: 750_000,
      description: 'Beli pasir (koreksi)',
    });

    const reversals = db.journalEntries.filter(
      (j) => j.reference_type === 'reversal' && j.reference_id === firstJournalId,
    );
    expect(reversals).toHaveLength(1);
    expect(reversals[0].total_amount).toBe(500_000);

    const updatedJournalId = db.costRealizations[0].journal_entry_id as string;
    expect(updatedJournalId).toBeTruthy();
    expect(updatedJournalId).not.toBe(firstJournalId);

    // Saldo Kas Proyek neto harus -750.000 (bukan -500.000)
    const kasProj = Number(db.accounts.find((a) => a.id === 'acc-kas-proj')!.current_balance);
    expect(kasProj).toBe(-750_000);
  });

  it('T4: deleteCostRealization dan deleteProjectIncome melakukan soft-delete + jurnal pembalik', async () => {
    const { income } = await createProjectIncome({
      project_id: 'proj-1',
      date: '2026-11-24',
      amount: 2_000_000,
      category: 'dp',
      description: 'DP 1',
      status: 'received',
      recorded_by: 'user-1',
    });
    const cost = await createCostRealization({
      project_id: 'proj-1',
      date: '2026-11-24',
      description: 'Beli cat',
      total_amount: 300_000,
      recorded_by: 'user-1',
      status: 'recorded',
    });

    await deleteCostRealization(cost.id, 'proj-1');
    await deleteProjectIncome(income.id, 'proj-1');

    // Baris sumber tetap ada sebagai soft-delete (status='cancelled' & deleted_at terisi)
    expect(db.costRealizations).toHaveLength(1);
    expect(db.costRealizations[0].status).toBe('cancelled');
    expect(db.costRealizations[0].deleted_at).toBeTruthy();

    expect(db.projectIncomes).toHaveLength(1);
    expect(db.projectIncomes[0].status).toBe('cancelled');
    expect(db.projectIncomes[0].deleted_at).toBeTruthy();

    // Load aktif mengembalikan array kosong
    expect(await loadCostRealizations('proj-1')).toHaveLength(0);
    expect(await loadProjectIncomes('proj-1')).toHaveLength(0);

    // Kedua jurnal asli punya reversal sehingga kas dan laba kembali ke 0
    expect(db.journalEntries.filter((j) => j.reference_type === 'reversal')).toHaveLength(2);
    expect(Number(db.accounts.find((a) => a.id === 'acc-kas-proj')!.current_balance)).toBe(0);
    expect(Number(db.accounts.find((a) => a.id === 'acc-laba')!.current_balance)).toBe(0);
  });
});

