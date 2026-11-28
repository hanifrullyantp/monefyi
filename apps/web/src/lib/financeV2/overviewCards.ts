import { toRupiah } from '@domain/journal';
import type { FinanceAccount, Payable, Receivable } from '../../types/financeV2';
import type { JournalLineEnriched } from './reports/types';
import { buildProfitLossFromLines } from './reports/profitLossReport';
import { buildProjectReports } from './reports/projectReport';

export type WalletSummaryCardItem = {
  accountId: string;
  name: string;
  balance: number;
};

export type OverviewCashAndDebtCard = {
  totalCash: number;
  wallets: WalletSummaryCardItem[];
  totalReceivable: number;
  overdueReceivable: number;
  retentionReceivable: number;
  totalPayable: number;
  overduePayable: number;
  netPosition: number;
};

export type ProjectProfitOverviewRow = {
  projectId: string;
  projectName: string;
  revenue: number;
  hpp: number;
  profit: number;
  marginPct: number;
  rapPlanned: number;
  rapActual: number;
  rapRemaining: number;
  rapUsagePct: number;
};

export type BusinessMonthOverviewCard = {
  monthLabel: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
  opexPlanned: number;
  opexActual: number;
  opexVariance: number;
  netProfit: number;
  netMarginPct: number;
};

export type FinanceOverviewThreeCardsData = {
  card1CashDebt: OverviewCashAndDebtCard;
  card2Projects: ProjectProfitOverviewRow[];
  card3BusinessMonth: BusinessMonthOverviewCard;
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Menyusun 3 kartu ringkasan halaman depan dari satu buku besar financeV2,
 * anggaran RAP proyek, dan anggaran opex bulanan.
 */
export function buildOverviewThreeCards(input: {
  todayIso: string;
  monthLabel: string;
  accounts: Pick<FinanceAccount, 'id' | 'name' | 'type' | 'current_balance'>[];
  monthLines: JournalLineEnriched[];
  allProjectLines: JournalLineEnriched[];
  projectNames: Record<string, string>;
  opexCategoryNames: Record<string, string>;
  receivableProjectMap?: Record<string, string | null>;
  opexRealizationCategory?: Record<string, string>;
  rapPlannedByProject: Record<string, number>;
  receivables: Pick<Receivable, 'amount' | 'paid_amount' | 'due_date' | 'status'>[];
  payables: Pick<Payable, 'amount' | 'paid_amount' | 'due_date' | 'status'>[];
  monthlyOpexPlanned: number;
}): FinanceOverviewThreeCardsData {
  const wallets = input.accounts
    .filter((a) => a.type === 'kas')
    .map((a) => ({
      accountId: a.id,
      name: a.name,
      balance: toRupiah(a.current_balance),
    }))
    .sort((a, b) => b.balance - a.balance);

  const totalCash = toRupiah(wallets.reduce((s, w) => s + w.balance, 0));

  let totalReceivable = 0;
  let overdueReceivable = 0;
  for (const r of input.receivables) {
    if (r.status === 'paid') continue;
    const open = Math.max(0, toRupiah(r.amount - r.paid_amount));
    totalReceivable += open;
    if (r.due_date && r.due_date <= input.todayIso) {
      overdueReceivable += open;
    }
  }

  const retentionReceivable = toRupiah(
    input.accounts
      .filter((a) => a.type === 'piutang_retensi')
      .reduce((s, a) => s + Math.max(0, a.current_balance), 0),
  );

  let totalPayable = 0;
  let overduePayable = 0;
  for (const p of input.payables) {
    if (p.status === 'paid') continue;
    const open = Math.max(0, toRupiah(p.amount - p.paid_amount));
    totalPayable += open;
    if (p.due_date && p.due_date <= input.todayIso) {
      overduePayable += open;
    }
  }

  const projectReports = buildProjectReports(input.allProjectLines, input.projectNames);
  const projectMap = new Map(projectReports.map((p) => [p.projectId, p]));
  const allProjectIds = new Set<string>([
    ...Object.keys(input.projectNames),
    ...Object.keys(input.rapPlannedByProject),
    ...projectReports.map((p) => p.projectId),
  ]);

  const card2Projects: ProjectProfitOverviewRow[] = Array.from(allProjectIds)
    .map((projectId) => {
      const rep = projectMap.get(projectId);
      const revenue = toRupiah(rep?.revenue || 0);
      const hpp = toRupiah(rep?.expense || 0);
      const profit = toRupiah(revenue - hpp);
      const rapPlanned = toRupiah(input.rapPlannedByProject[projectId] || 0);
      const rapActual = hpp;
      return {
        projectId,
        projectName: input.projectNames[projectId] || rep?.projectName || projectId,
        revenue,
        hpp,
        profit,
        marginPct: pct(profit, revenue),
        rapPlanned,
        rapActual,
        rapRemaining: toRupiah(rapPlanned - rapActual),
        rapUsagePct: pct(rapActual, rapPlanned),
      };
    })
    .sort((a, b) => b.profit - a.profit || b.rapPlanned - a.rapPlanned);

  const monthPl = buildProfitLossFromLines(
    input.monthLines,
    input.projectNames,
    input.opexCategoryNames,
    input.receivableProjectMap || {},
    input.opexRealizationCategory || {},
  );
  const opexPlanned = toRupiah(input.monthlyOpexPlanned);
  const opexActual = toRupiah(monthPl.opex);
  const grossProfit = toRupiah(monthPl.grossProfit);
  const netProfit = toRupiah(grossProfit - opexActual - monthPl.otherExpense);

  return {
    card1CashDebt: {
      totalCash,
      wallets,
      totalReceivable: toRupiah(totalReceivable),
      overdueReceivable: toRupiah(overdueReceivable),
      retentionReceivable,
      totalPayable: toRupiah(totalPayable),
      overduePayable: toRupiah(overduePayable),
      netPosition: toRupiah(totalCash + totalReceivable + retentionReceivable - totalPayable),
    },
    card2Projects,
    card3BusinessMonth: {
      monthLabel: input.monthLabel,
      revenue: toRupiah(monthPl.revenue),
      hpp: toRupiah(monthPl.hpp),
      grossProfit,
      opexPlanned,
      opexActual,
      opexVariance: toRupiah(opexPlanned - opexActual),
      netProfit,
      netMarginPct: pct(netProfit, monthPl.revenue),
    },
  };
}

