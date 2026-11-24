import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hppRoleForRapType,
  linesAreBalanced,
  projectExpense,
  projectIncome,
  resolveProjectCostTemplate,
  resolveProjectIncomeTemplate,
  toRupiah,
  type TemplateLine,
} from '../../../../../../packages/domain/src/journal';

const postedJournalPayloads: Array<{ p_lines: Array<Record<string, unknown>>; p_reference_type: string }> = [];
const mockAccounts = [
  { id: 'acc-kas-proj', org_id: 'org-1', type: 'kas', category: 'aktiva', name: 'Kas Proyek Demo', project_id: 'proj-1', parent_id: null, is_system: false, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-piutang', org_id: 'org-1', type: 'piutang', category: 'aktiva', name: 'Piutang Usaha', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-piutang-retensi', org_id: 'org-1', type: 'piutang_retensi', category: 'aktiva', name: 'Piutang Retensi', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-uang-muka', org_id: 'org-1', type: 'uang_muka_klien', category: 'pasiva', name: 'Uang Muka Klien', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-pendapatan-proyek', org_id: 'org-1', type: 'pendapatan_proyek', category: 'pendapatan', name: 'Pendapatan Proyek', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-hutang-dagang', org_id: 'org-1', type: 'hutang_dagang', category: 'pasiva', name: 'Hutang Dagang', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-hpp-material', org_id: 'org-1', type: 'hpp_material', category: 'beban', name: 'HPP Material', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-hpp-labor', org_id: 'org-1', type: 'hpp_labor', category: 'beban', name: 'HPP Tenaga Kerja', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-hpp-uncategorized', org_id: 'org-1', type: 'hpp_uncategorized', category: 'beban', name: 'HPP Uncategorized', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
  { id: 'acc-laba-legacy', org_id: 'org-1', type: 'laba', category: 'pasiva', name: 'Laba Periode Berjalan', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 0, metadata: {}, created_at: '', updated_at: '' },
];

const mockRapItems = [
  { id: 'rap-mat', type: 'material' },
  { id: 'rap-lab', type: 'labor' },
];

function createBridgeMockQuery(table: string) {
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];
  const rows: Record<string, unknown>[] =
    table === 'planner_projects'
      ? [{ id: 'proj-1', org_id: 'org-1', name: 'Proyek Demo' }]
      : table === 'planner_finance_accounts'
        ? mockAccounts
        : table === 'planner_rap_items'
          ? mockRapItems
          : table === 'planner_journal_entries'
            ? [{ id: 'je-mock-1', org_id: 'org-1', entry_date: '2026-11-24', description: 'Mock', reference_type: 'project_income', reference_id: 'ref-1', total_amount: 100, created_by: null, created_at: '' }]
            : [];

  const exec = async () => ({
    data: rows.filter((r) => filters.every((fn) => fn(r))),
    error: null,
  });

  const builder: Record<string, unknown> = {
    select() { return builder; },
    eq(col: string, val: unknown) { filters.push((r) => r[col] === val); return builder; },
    is(col: string, val: unknown) { filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return builder; },
    order() { return builder; },
    async single() {
      const res = await exec();
      return { data: res.data[0] ?? null, error: res.data[0] ? null : { message: 'Not found' } };
    },
    async maybeSingle() {
      const res = await exec();
      return { data: res.data[0] ?? null, error: null };
    },
    then(onFulfilled?: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
      return exec().then(onFulfilled, onRejected);
    },
  };
  return builder;
}

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => createBridgeMockQuery(table),
    rpc: vi.fn(async (fn: string, params: Record<string, unknown>) => {
      if (fn === 'seed_default_chart_of_accounts') return { data: null, error: null };
      if (fn === 'planner_post_journal') {
        postedJournalPayloads.push({
          p_lines: (params.p_lines as Array<Record<string, unknown>>) || [],
          p_reference_type: String(params.p_reference_type || ''),
        });
        return { data: 'je-mock-1', error: null };
      }
      return { data: null, error: null };
    }),
  },
}));

import {
  postProjectExpenseJournal,
  postProjectIncomeJournal,
} from '../../../services/financeV2/projectJournalBridge';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const G02_SQL_PATH = resolve(
  REPO_ROOT,
  'my-supabase-project/supabase/migrations/20261124143000_g0_2_rpc_f1_accounts.sql',
);
const BRIDGE_PATH = resolve(
  REPO_ROOT,
  'apps/web/src/services/financeV2/projectJournalBridge.ts',
);

const g02Sql = readFileSync(G02_SQL_PATH, 'utf8');
const bridgeTs = readFileSync(BRIDGE_PATH, 'utf8');

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

function extractSqlFunctionBody(sql: string, fnName: string): string {
  const re = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${fnName}\\b[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`,
    'i',
  );
  const match = sql.match(re);
  if (!match) {
    throw new Error(`Fungsi SQL public.${fnName} tidak ditemukan di ${G02_SQL_PATH}`);
  }
  return match[1];
}

/**
 * Mengevaluasi spesifikasi CASE WHEN ... THEN ... pada `planner_hpp_account_type_for_rap`
 * langsung dari teks SQL agar setiap penyimpangan antara SQL dan TS langsung gagal.
 */
function evalSqlHppMapperFromFile(rapType?: string | null): string {
  const body = extractSqlFunctionBody(g02Sql, 'planner_hpp_account_type_for_rap');
  const whenMatches = [...body.matchAll(/WHEN\s+'([^']+)'\s+THEN\s+'([^']+)'/gi)];
  const elseMatch = body.match(/ELSE\s+'([^']+)'/i);
  expect(whenMatches.length).toBeGreaterThanOrEqual(10);
  expect(elseMatch).not.toBeNull();

  const normalized = String(rapType ?? '').trim().toLowerCase();
  for (const [, key, role] of whenMatches) {
    if (normalized === key.toLowerCase()) return role;
  }
  return elseMatch![1];
}

interface SqlIncomeBranch {
  categories: string[];
  statuses: string[];
  debitType: string;
  creditType: string;
}

function parseSqlIncomeBranchesFromFile(): SqlIncomeBranch[] {
  const body = extractSqlFunctionBody(g02Sql, 'planner_create_project_income_atomic');
  const branchRe =
    /(?:IF|ELSIF)\s+v_category\s+(=|IN)\s+(\([^)]+\)|'[^']+')\s+AND\s+v_status\s+(=|IN)\s+(\([^)]+\)|'[^']+')\s+THEN\s+v_debit_type\s*:=\s*'([^']+)';\s*v_credit_type\s*:=\s*'([^']+)';/gi;

  const parseList = (raw: string): string[] =>
    [...raw.matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase());

  const branches: SqlIncomeBranch[] = [];
  for (const m of body.matchAll(branchRe)) {
    branches.push({
      categories: parseList(m[2]),
      statuses: parseList(m[4]),
      debitType: m[5],
      creditType: m[6],
    });
  }
  return branches;
}

function evalSqlIncomeSpecFromFile(
  category: string | null | undefined,
  status: string | null | undefined,
  amount: number,
): TemplateLine[] {
  const value = Math.round(amount);
  if (!Number.isFinite(amount) || value <= 0) return [];
  const cat = String(category ?? '').trim().toLowerCase() || 'other';
  const st = String(status ?? '').trim().toLowerCase() || 'received';
  const branches = parseSqlIncomeBranchesFromFile();
  const matched = branches.find((b) => b.categories.includes(cat) && b.statuses.includes(st));
  if (!matched) return [];
  return [
    { role: matched.debitType as TemplateLine['role'], debit: value, credit: 0 },
    { role: matched.creditType as TemplateLine['role'], debit: 0, credit: value },
  ];
}

function evalSqlCostSpecFromFile(
  rapType: string | null | undefined,
  paymentMethod: string | null | undefined,
  status: string | null | undefined,
  amount: number,
): { lines: TemplateLine[]; needsReview: boolean } {
  const body = extractSqlFunctionBody(g02Sql, 'planner_create_cost_realization_atomic');
  const methodMatch = body.match(/lower\(btrim\(COALESCE\(p_payment_method,\s*''\)\)\)\s+IN\s*\(([^)]+)\)/i);
  const statusMatch = body.match(/lower\(btrim\(COALESCE\(p_status,\s*''\)\)\)\s+IN\s*\(([^)]+)\)/i);
  const accrualAccountMatch = body.match(/IF\s+v_is_accrual\s+THEN[\s\S]*?type\s*=\s*'([^']+)'/i);
  expect(methodMatch).not.toBeNull();
  expect(statusMatch).not.toBeNull();
  expect(accrualAccountMatch).not.toBeNull();

  const accrualMethods = [...methodMatch![1].matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase());
  const accrualStatuses = [...statusMatch![1].matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase());
  const accrualCreditType = accrualAccountMatch![1] as TemplateLine['role'];

  const value = Math.round(amount);
  const st = String(status ?? '').trim().toLowerCase() || 'recorded';
  if (!Number.isFinite(amount) || value <= 0 || st === 'dividend' || st === 'cancelled') {
    return { lines: [], needsReview: false };
  }

  const hppType = evalSqlHppMapperFromFile(rapType) as TemplateLine['role'];
  const needsReview = hppType === 'hpp_uncategorized';
  const method = String(paymentMethod ?? '').trim().toLowerCase();
  const isAccrual = accrualMethods.includes(method) || accrualStatuses.includes(st);

  return {
    lines: [
      { role: hppType, debit: value, credit: 0 },
      { role: isAccrual ? accrualCreditType : 'kas', debit: 0, credit: value },
    ],
    needsReview,
  };
}

describe('G0-2: Paritas RPC SQL <-> packages/domain/src/journal.ts (Akun F1)', () => {
  it('uji struktural SQL 20261124143000_g0_2_rpc_f1_accounts.sql memenuhi semua kontrak G0-2', () => {
    const cleanedSql = stripSqlComments(g02Sql);

    expect(g02Sql).toMatch(/BLOCKED remote/i);
    expect(cleanedSql).not.toMatch(/type\s*=\s*'laba'/i);
    expect(cleanedSql).not.toMatch(/'laba'/i);

    expect(cleanedSql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.planner_hpp_account_type_for_rap\s*\(\s*p_rap_type\s+text\s*\)\s+RETURNS\s+text[\s\S]*?IMMUTABLE/i);

    const incomeBody = extractSqlFunctionBody(g02Sql, 'planner_create_project_income_atomic');
    expect(incomeBody).toContain("'uang_muka_klien'");
    expect(incomeBody).toContain("'pendapatan_proyek'");
    expect(incomeBody).toContain("'piutang_retensi'");
    expect(incomeBody).toContain("'piutang'");

    const costBody = extractSqlFunctionBody(g02Sql, 'planner_create_cost_realization_atomic');
    expect(costBody).toContain('planner_hpp_account_type_for_rap');
    expect(costBody).toContain("'hutang_dagang'");
    expect(costBody).toContain("'needs_review'");
    expect(costBody).toContain("'party_id'");
    expect(costBody).toContain("'project_id'");

    const backfillBody = extractSqlFunctionBody(g02Sql, 'planner_backfill_cost_journals');
    expect(backfillBody).toContain('planner_hpp_account_type_for_rap');
    expect(backfillBody).toContain('project_id');
    expect(backfillBody).toContain('needs_review');

    // Signature overload lama di-drop sebelum signature baru (+ p_party_id)
    expect(cleanedSql).toMatch(/DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.planner_create_project_income_atomic\(uuid,\s*date,\s*bigint,\s*text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*uuid\)/i);
    expect(cleanedSql).toMatch(/DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.planner_create_cost_realization_atomic\(uuid,\s*uuid,\s*date,\s*text,\s*numeric,\s*numeric,\s*bigint,\s*text,\s*text,\s*text,\s*uuid\)/i);
    expect(cleanedSql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.planner_create_project_income_atomic\([^\)]*uuid\s*,\s*uuid\)\s+TO\s+authenticated/i);
    expect(cleanedSql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.planner_create_cost_realization_atomic\([^\)]*uuid\s*,\s*uuid\)\s+TO\s+authenticated/i);
  });

  it('projectJournalBridge.ts & fungsi proyek di journal.ts bebas dari akun legacy laba', () => {
    expect(bridgeTs).not.toMatch(/findSystemAccount\([^)]*['"]laba['"]/);
    expect(bridgeTs).toContain('resolveProjectIncomeTemplate');
    expect(bridgeTs).toContain('resolveProjectCostTemplate');

    const legacyExpense = projectExpense(250_000);
    const legacyIncome = projectIncome(500_000);
    expect(legacyExpense.some((l) => l.role === 'laba')).toBe(false);
    expect(legacyIncome.some((l) => l.role === 'laba')).toBe(false);
    expect(legacyExpense[0].role).toBe('hpp_uncategorized');
    expect(legacyIncome[1].role).toBe('pendapatan_proyek');
  });

  it('paritas 100% pemetaan tipe RAP: planner_hpp_account_type_for_rap === hppRoleForRapType', () => {
    const rapInputs: Array<string | null | undefined> = [
      'material',
      'MATERIAL',
      ' labor ',
      'tenaga',
      'tukang',
      'equipment',
      'alat',
      'overhead',
      'other',
      'lain',
      'lainnya',
      'unknown',
      '',
      null,
      undefined,
    ];

    for (const rapType of rapInputs) {
      const tsRole = hppRoleForRapType(rapType);
      const sqlRole = evalSqlHppMapperFromFile(rapType);
      expect(sqlRole, `rapType=${String(rapType)}`).toBe(tsRole);
      expect(tsRole).not.toBe('laba');
    }
  });

  it('paritas 100% matriks pemasukan proyek (DP, termin/pelunasan/other received & akrual, retensi hold & release)', () => {
    const scenarios: Array<{
      label: string;
      category: string | null;
      status: string | null;
      amount: number;
      expectedRoles: [string, string] | null;
    }> = [
      { label: 'DP received', category: 'dp', status: 'received', amount: 15_000_000.4, expectedRoles: ['kas', 'uang_muka_klien'] },
      { label: 'DP pending (no journal)', category: 'dp', status: 'pending', amount: 15_000_000, expectedRoles: null },
      { label: 'Termin received', category: 'termin', status: 'received', amount: 25_000_000, expectedRoles: ['kas', 'pendapatan_proyek'] },
      { label: 'Pelunasan received', category: 'pelunasan', status: 'received', amount: 10_000_000, expectedRoles: ['kas', 'pendapatan_proyek'] },
      { label: 'Other received', category: 'other', status: 'received', amount: 3_500_000, expectedRoles: ['kas', 'pendapatan_proyek'] },
      { label: 'Termin invoiced (akrual)', category: 'termin', status: 'invoiced', amount: 20_000_000, expectedRoles: ['piutang', 'pendapatan_proyek'] },
      { label: 'Termin accrued (akrual)', category: 'termin', status: 'accrued', amount: 20_000_000, expectedRoles: ['piutang', 'pendapatan_proyek'] },
      { label: 'Pelunasan invoiced (akrual)', category: 'pelunasan', status: 'invoiced', amount: 8_000_000, expectedRoles: ['piutang', 'pendapatan_proyek'] },
      { label: 'Other accrued (akrual)', category: 'other', status: 'accrued', amount: 2_000_000, expectedRoles: ['piutang', 'pendapatan_proyek'] },
      { label: 'Retensi hold (pending)', category: 'retensi', status: 'pending', amount: 5_000_000, expectedRoles: ['piutang_retensi', 'pendapatan_proyek'] },
      { label: 'Retensi hold (invoiced)', category: 'retensi', status: 'invoiced', amount: 5_000_000, expectedRoles: ['piutang_retensi', 'pendapatan_proyek'] },
      { label: 'Retensi hold (accrued)', category: 'retensi', status: 'accrued', amount: 5_000_000, expectedRoles: ['piutang_retensi', 'pendapatan_proyek'] },
      { label: 'Retensi release (received)', category: 'retensi', status: 'received', amount: 5_000_000, expectedRoles: ['kas', 'piutang_retensi'] },
      { label: 'Cancelled (no journal)', category: 'termin', status: 'cancelled', amount: 5_000_000, expectedRoles: null },
      { label: 'Zero amount (no journal)', category: 'termin', status: 'received', amount: 0, expectedRoles: null },
    ];

    for (const s of scenarios) {
      const tsLines = resolveProjectIncomeTemplate(s.category, s.status, s.amount);
      const sqlLines = evalSqlIncomeSpecFromFile(s.category, s.status, s.amount);

      expect(tsLines, s.label).toEqual(sqlLines);

      if (s.expectedRoles === null) {
        expect(tsLines, s.label).toEqual([]);
      } else {
        const expectedAmount = toRupiah(s.amount);
        expect(tsLines, s.label).toEqual([
          { role: s.expectedRoles[0], debit: expectedAmount, credit: 0 },
          { role: s.expectedRoles[1], debit: 0, credit: expectedAmount },
        ]);
        expect(linesAreBalanced(tsLines), s.label).toBe(true);
        for (const line of tsLines) {
          expect(Number.isInteger(line.debit), s.label).toBe(true);
          expect(Number.isInteger(line.credit), s.label).toBe(true);
          expect(line.role, s.label).not.toBe('laba');
        }
      }
    }
  });

  it('paritas 100% matriks biaya proyek (6 tipe RAP x tunai vs akrual/hutang)', () => {
    const rapCases: Array<{ rapType: string | null; expectedHpp: string; expectedNeedsReview: boolean }> = [
      { rapType: 'material', expectedHpp: 'hpp_material', expectedNeedsReview: false },
      { rapType: 'labor', expectedHpp: 'hpp_labor', expectedNeedsReview: false },
      { rapType: 'equipment', expectedHpp: 'hpp_equipment', expectedNeedsReview: false },
      { rapType: 'overhead', expectedHpp: 'hpp_overhead', expectedNeedsReview: false },
      { rapType: 'other', expectedHpp: 'hpp_other', expectedNeedsReview: false },
      { rapType: null, expectedHpp: 'hpp_uncategorized', expectedNeedsReview: true },
    ];

    const paymentModes: Array<{
      label: string;
      paymentMethod: string | null;
      status: string;
      expectedCredit: 'kas' | 'hutang_dagang';
    }> = [
      { label: 'tunai', paymentMethod: 'cash', status: 'recorded', expectedCredit: 'kas' },
      { label: 'transfer', paymentMethod: 'transfer', status: 'recorded', expectedCredit: 'kas' },
      { label: 'default null', paymentMethod: null, status: 'recorded', expectedCredit: 'kas' },
      { label: 'akrual credit', paymentMethod: 'credit', status: 'recorded', expectedCredit: 'hutang_dagang' },
      { label: 'akrual hutang', paymentMethod: 'hutang', status: 'recorded', expectedCredit: 'hutang_dagang' },
      { label: 'akrual tempo', paymentMethod: 'tempo', status: 'recorded', expectedCredit: 'hutang_dagang' },
      { label: 'status accrued', paymentMethod: 'cash', status: 'accrued', expectedCredit: 'hutang_dagang' },
      { label: 'status unpaid', paymentMethod: null, status: 'unpaid', expectedCredit: 'hutang_dagang' },
    ];

    for (const rap of rapCases) {
      for (const mode of paymentModes) {
        const amount = 1_250_000.6;
        const label = `${rap.rapType ?? 'uncategorized'} / ${mode.label}`;
        const tsLines = resolveProjectCostTemplate(rap.rapType, mode.paymentMethod, mode.status, amount);
        const sqlSpec = evalSqlCostSpecFromFile(rap.rapType, mode.paymentMethod, mode.status, amount);

        expect(tsLines, label).toEqual(sqlSpec.lines);
        expect(sqlSpec.needsReview, label).toBe(rap.expectedNeedsReview);
        expect(tsLines, label).toEqual([
          { role: rap.expectedHpp, debit: 1_250_001, credit: 0 },
          { role: mode.expectedCredit, debit: 0, credit: 1_250_001 },
        ]);
        expect(linesAreBalanced(tsLines), label).toBe(true);
        for (const line of tsLines) {
          expect(Number.isInteger(line.debit), label).toBe(true);
          expect(Number.isInteger(line.credit), label).toBe(true);
          expect(line.role, label).not.toBe('laba');
        }
      }
    }

    // Kasus non-posting (dividend / cancelled / <= 0)
    expect(resolveProjectCostTemplate('material', 'cash', 'dividend', 500_000)).toEqual([]);
    expect(resolveProjectCostTemplate('material', 'cash', 'cancelled', 500_000)).toEqual([]);
    expect(resolveProjectCostTemplate('material', 'cash', 'recorded', 0)).toEqual([]);
    expect(evalSqlCostSpecFromFile('material', 'cash', 'dividend', 500_000).lines).toEqual([]);
    expect(evalSqlCostSpecFromFile('material', 'cash', 'cancelled', 500_000).lines).toEqual([]);
  });
});

describe('G0-2: Runtime projectJournalBridge.ts selaras dengan akun F1 dan bebas laba', () => {
  beforeEach(() => {
    postedJournalPayloads.length = 0;
  });

  it('postProjectIncomeJournal memposting ke akun F1 sesuai kategori & status', async () => {
    await postProjectIncomeJournal({
      projectId: 'proj-1',
      amount: 10_000_000,
      description: 'DP klien',
      referenceId: 'inc-dp',
      category: 'dp',
      status: 'received',
      partyId: 'party-client',
    });
    expect(postedJournalPayloads.at(-1)?.p_lines).toEqual([
      expect.objectContaining({ account_id: 'acc-kas-proj', debit: 10_000_000, credit: 0, project_id: 'proj-1', party_id: 'party-client' }),
      expect.objectContaining({ account_id: 'acc-uang-muka', debit: 0, credit: 10_000_000, project_id: 'proj-1', party_id: 'party-client' }),
    ]);

    await postProjectIncomeJournal({
      projectId: 'proj-1',
      amount: 5_000_000,
      description: 'Retensi ditahan',
      referenceId: 'inc-ret-hold',
      category: 'retensi',
      status: 'pending',
    });
    expect(postedJournalPayloads.at(-1)?.p_lines).toEqual([
      expect.objectContaining({ account_id: 'acc-piutang-retensi', debit: 5_000_000, credit: 0, project_id: 'proj-1' }),
      expect.objectContaining({ account_id: 'acc-pendapatan-proyek', debit: 0, credit: 5_000_000, project_id: 'proj-1' }),
    ]);

    await postProjectIncomeJournal({
      projectId: 'proj-1',
      amount: 5_000_000,
      description: 'Retensi cair',
      referenceId: 'inc-ret-rel',
      category: 'retensi',
      status: 'received',
    });
    expect(postedJournalPayloads.at(-1)?.p_lines).toEqual([
      expect.objectContaining({ account_id: 'acc-kas-proj', debit: 5_000_000, credit: 0, project_id: 'proj-1' }),
      expect.objectContaining({ account_id: 'acc-piutang-retensi', debit: 0, credit: 5_000_000, project_id: 'proj-1' }),
    ]);

    await postProjectIncomeJournal({
      projectId: 'proj-1',
      amount: 12_000_000,
      description: 'Termin invoiced',
      referenceId: 'inc-term-inv',
      category: 'termin',
      status: 'invoiced',
      partyId: 'party-client',
    });
    expect(postedJournalPayloads.at(-1)?.p_lines).toEqual([
      expect.objectContaining({ account_id: 'acc-piutang', debit: 12_000_000, credit: 0, project_id: 'proj-1', party_id: 'party-client' }),
      expect.objectContaining({ account_id: 'acc-pendapatan-proyek', debit: 0, credit: 12_000_000, project_id: 'proj-1', party_id: 'party-client' }),
    ]);

    // Tidak pernah menyentuh acc-laba-legacy
    for (const payload of postedJournalPayloads) {
      expect(payload.p_lines.some((l) => l.account_id === 'acc-laba-legacy')).toBe(false);
    }
  });

  it('postProjectExpenseJournal memposting HPP F1 + akrual hutang_dagang + needs_review', async () => {
    await postProjectExpenseJournal({
      projectId: 'proj-1',
      amount: 2_000_000,
      description: 'Beli semen',
      referenceId: 'cost-mat',
      rapItemId: 'rap-mat',
      paymentMethod: 'cash',
      status: 'recorded',
    });
    expect(postedJournalPayloads.at(-1)?.p_lines).toEqual([
      expect.objectContaining({ account_id: 'acc-hpp-material', debit: 2_000_000, credit: 0, project_id: 'proj-1', needs_review: false }),
      expect.objectContaining({ account_id: 'acc-kas-proj', debit: 0, credit: 2_000_000, project_id: 'proj-1', needs_review: false }),
    ]);

    await postProjectExpenseJournal({
      projectId: 'proj-1',
      amount: 3_500_000,
      description: 'Upah tukang tempo',
      referenceId: 'cost-lab',
      rapItemId: 'rap-lab',
      paymentMethod: 'tempo',
      status: 'recorded',
      partyId: 'party-mandor',
    });
    expect(postedJournalPayloads.at(-1)?.p_lines).toEqual([
      expect.objectContaining({ account_id: 'acc-hpp-labor', debit: 3_500_000, credit: 0, project_id: 'proj-1', needs_review: false }),
      expect.objectContaining({ account_id: 'acc-hutang-dagang', debit: 0, credit: 3_500_000, project_id: 'proj-1', party_id: 'party-mandor', needs_review: false }),
    ]);

    await postProjectExpenseJournal({
      projectId: 'proj-1',
      amount: 450_000,
      description: 'Biaya tanpa RAP',
      referenceId: 'cost-uncat',
      rapItemId: null,
      paymentMethod: 'cash',
      status: 'recorded',
    });
    expect(postedJournalPayloads.at(-1)?.p_lines).toEqual([
      expect.objectContaining({ account_id: 'acc-hpp-uncategorized', debit: 450_000, credit: 0, project_id: 'proj-1', needs_review: true }),
      expect.objectContaining({ account_id: 'acc-kas-proj', debit: 0, credit: 450_000, project_id: 'proj-1', needs_review: false }),
    ]);

    for (const payload of postedJournalPayloads) {
      expect(payload.p_lines.some((l) => l.account_id === 'acc-laba-legacy')).toBe(false);
    }
  });
});
