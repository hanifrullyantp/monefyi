import { balanceDelta } from '../../financeV2Calc';
import { toRupiah } from '@domain/journal';
import type { AccountCategory } from '../../../types/financeV2';
import type { JournalLineEnriched, ProfitLossReport, ReportFilters } from './types';
import { loadEnrichedJournalLines } from './loadReportData';

const EQUITY_TRANSFER_REFS = new Set(['project_close', 'period_close', 'dividend']);
type HppRapBucket = 'material' | 'labor' | 'equipment' | 'overhead' | 'other' | 'uncategorized';

function isPlAccountType(type: string): boolean {
  return (
    type === 'laba'
    || type === 'pendapatan_proyek'
    || type.startsWith('hpp_')
    || type === 'beban_opex'
    || type === 'beban_penyusutan'
  );
}

function hppBucketForAccountType(type: string): HppRapBucket {
  if (type === 'hpp_material') return 'material';
  if (type === 'hpp_labor') return 'labor';
  if (type === 'hpp_equipment') return 'equipment';
  if (type === 'hpp_overhead') return 'overhead';
  if (type === 'hpp_other') return 'other';
  return 'uncategorized';
}

export function buildProfitLossFromLines(
  lines: JournalLineEnriched[],
  projectNames: Record<string, string>,
  opexCategoryNames: Record<string, string>,
  receivableProjectMap: Record<string, string | null>,
  opexRealizationCategory: Record<string, string> = {},
): ProfitLossReport {
  let revenue = 0;
  let hpp = 0;
  let opex = 0;
  let otherExpense = 0;

  const revenueByProjectMap: Record<string, number> = {};
  const hppMap: Record<string, number> = {};
  const hppByRapType: Record<HppRapBucket, number> = {
    material: 0,
    labor: 0,
    equipment: 0,
    overhead: 0,
    other: 0,
    uncategorized: 0,
  };
  const opexMap: Record<string, number> = {};

  const journalRefMap = new Map<string, { referenceType: string | null; referenceId: string | null }>();
  for (const line of lines) {
    if (!journalRefMap.has(line.journalId)) {
      journalRefMap.set(line.journalId, {
        referenceType: line.referenceType,
        referenceId: line.referenceId,
      });
    }
  }

  for (const line of lines) {
    if (!isPlAccountType(line.accountType)) continue;
    if (line.referenceType && EQUITY_TRANSFER_REFS.has(line.referenceType)) continue;

    if (line.referenceType === 'reversal') {
      const orig = line.referenceId ? journalRefMap.get(line.referenceId) : undefined;
      const origType = orig?.referenceType || null;
      if (origType && EQUITY_TRANSFER_REFS.has(origType)) continue;

      if (line.accountType === 'pendapatan_proyek' || origType === 'project_income' || (!origType && line.debit > 0 && line.credit === 0 && line.accountType === 'laba')) {
        const revDelta = line.debit - line.credit;
        revenue -= revDelta;
        const pid = line.projectId || (orig?.referenceId ? receivableProjectMap[orig.referenceId] : null) || null;
        const key = pid || '_none';
        revenueByProjectMap[key] = (revenueByProjectMap[key] || 0) - revDelta;
      } else if (line.accountType === 'beban_opex' || origType === 'opex') {
        const opexDelta = line.credit - line.debit;
        opex -= opexDelta;
        if (orig?.referenceId) {
          const catKey = opexRealizationCategory[orig.referenceId] || orig.referenceId;
          opexMap[catKey] = (opexMap[catKey] || 0) - opexDelta;
        }
      } else if (line.accountType === 'beban_penyusutan' || origType === 'amortize' || origType === 'depreciation') {
        otherExpense -= (line.credit - line.debit);
      } else {
        const hppDelta = line.credit - line.debit;
        hpp -= hppDelta;
        const bucket = hppBucketForAccountType(line.accountType);
        hppByRapType[bucket] -= hppDelta;
        hppMap['Biaya Proyek'] = (hppMap['Biaya Proyek'] || 0) - hppDelta;
      }
      continue;
    }

    // Akun F1 khusus
    if (line.accountType === 'pendapatan_proyek') {
      const amt = line.credit - line.debit;
      revenue += amt;
      const key = line.projectId || '_none';
      revenueByProjectMap[key] = (revenueByProjectMap[key] || 0) + amt;
      continue;
    }
    if (line.accountType.startsWith('hpp_')) {
      const amt = line.debit - line.credit;
      hpp += amt;
      const bucket = hppBucketForAccountType(line.accountType);
      hppByRapType[bucket] += amt;
      const hppLabel = line.projectId ? (projectNames[line.projectId] || 'Biaya Proyek') : 'Biaya Proyek';
      hppMap[hppLabel] = (hppMap[hppLabel] || 0) + amt;
      continue;
    }
    if (line.accountType === 'beban_opex') {
      const amt = line.debit - line.credit;
      opex += amt;
      if (line.referenceId) {
        const catKey = opexRealizationCategory[line.referenceId] || line.referenceId;
        opexMap[catKey] = (opexMap[catKey] || 0) + amt;
      }
      continue;
    }
    if (line.accountType === 'beban_penyusutan') {
      otherExpense += (line.debit - line.credit);
      continue;
    }

    // Kompatibilitas akun 'laba' F0
    if (line.credit > 0) {
      revenue += line.credit;
      let pid: string | null = line.projectId;
      if (!pid && line.referenceType === 'project_income' && line.referenceId) {
        pid = receivableProjectMap[line.referenceId] ?? null;
      }
      const key = pid || '_none';
      revenueByProjectMap[key] = (revenueByProjectMap[key] || 0) + line.credit;
    }

    if (line.debit > 0) {
      if (line.referenceType === 'opex' && line.referenceId) {
        opex += line.debit;
        const catKey = opexRealizationCategory[line.referenceId] || line.referenceId;
        opexMap[catKey] = (opexMap[catKey] || 0) + line.debit;
      } else if (line.referenceType === 'opex' || line.referenceType === 'bon_disbursement') {
        opex += line.debit;
      } else if (line.referenceType === 'project_expense' || line.referenceType === 'payable_payment') {
        hpp += line.debit;
        hppByRapType.uncategorized += line.debit;
        const hppLabel = line.projectId
          ? (projectNames[line.projectId] || 'Biaya Proyek')
          : 'Biaya Proyek';
        hppMap[hppLabel] = (hppMap[hppLabel] || 0) + line.debit;
      } else if (line.referenceType === 'payroll_disbursement' || line.referenceType === 'payroll_accrual') {
        if (line.projectId) {
          hpp += line.debit;
          hppByRapType.labor += line.debit;
          hppMap['Tenaga Kerja Proyek'] = (hppMap['Tenaga Kerja Proyek'] || 0) + line.debit;
        } else {
          opex += line.debit;
        }
      } else if (line.referenceType === 'amortize' || line.referenceType === 'depreciation') {
        otherExpense += line.debit;
      } else {
        otherExpense += line.debit;
      }
    }
  }

  const grossProfit = revenue - hpp;
  const netProfit = grossProfit - opex - otherExpense;

  return {
    revenue: round(revenue),
    hpp: round(hpp),
    grossProfit: round(grossProfit),
    opex: round(opex),
    otherExpense: round(otherExpense),
    netProfit: round(netProfit),
    revenueByProject: Object.entries(revenueByProjectMap)
      .filter(([, amount]) => round(amount) !== 0)
      .map(([key, amount]) => ({
        projectId: key === '_none' ? null : key,
        projectName: key === '_none' ? 'Umum' : (projectNames[key] || key.slice(0, 8)),
        amount: round(amount),
      }))
      .sort((a, b) => b.amount - a.amount),
    hppBreakdown: Object.entries(hppMap)
      .filter(([, amount]) => round(amount) !== 0)
      .map(([label, amount]) => ({
        label,
        amount: round(amount),
      })),
    hppByRapType: {
      material: round(hppByRapType.material),
      labor: round(hppByRapType.labor),
      equipment: round(hppByRapType.equipment),
      overhead: round(hppByRapType.overhead),
      other: round(hppByRapType.other),
      uncategorized: round(hppByRapType.uncategorized),
    },
    opexBreakdown: Object.entries(opexMap)
      .filter(([, amount]) => round(amount) !== 0)
      .map(([categoryId, amount]) => ({
        categoryId,
        categoryName: opexCategoryNames[categoryId] || 'Opex',
        amount: round(amount),
      })),
  };
}

export async function buildProfitLossReport(
  filters: ReportFilters,
  ctx: {
    projectNames: Record<string, string>;
    opexCategoryNames: Record<string, string>;
    receivableProjectMap: Record<string, string | null>;
    opexRealizationCategory: Record<string, string>;
  },
): Promise<ProfitLossReport> {
  let lines = await loadEnrichedJournalLines(filters);
  if (filters.categoryId) {
    lines = lines.filter(line => {
      if (line.referenceType !== 'opex' || !line.referenceId) return true;
      return resolveOpexCategory(line, ctx.opexRealizationCategory) === filters.categoryId;
    });
  }
  return buildProfitLossFromLines(
    lines,
    ctx.projectNames,
    ctx.opexCategoryNames,
    ctx.receivableProjectMap,
    ctx.opexRealizationCategory,
  );
}

function resolveOpexCategory(
  line: JournalLineEnriched,
  map: Record<string, string>,
): string | undefined {
  return line.referenceId ? map[line.referenceId] : undefined;
}

function round(n: number) {
  return toRupiah(n);
}

/** Replay account balances from journal lines for balance sheet as-of. */
export function balancesFromLines(lines: JournalLineEnriched[]): Map<string, {
  name: string;
  type: string;
  category: AccountCategory;
  balance: number;
}> {
  const map = new Map<string, { name: string; type: string; category: AccountCategory; balance: number }>();
  for (const line of lines) {
    const existing = map.get(line.accountId) || {
      name: line.accountName,
      type: line.accountType,
      category: line.accountCategory,
      balance: 0,
    };
    existing.balance = round(existing.balance + balanceDelta(line.accountCategory, line.debit, line.credit));
    map.set(line.accountId, existing);
  }
  return map;
}
