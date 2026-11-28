import { supabase } from '../../lib/supabase';
import { buildFinanceReportBundle } from '../../lib/financeV2/reports';
import { loadEnrichedJournalLines } from '../../lib/financeV2/reports/loadReportData';
import { toRupiah } from '@domain/journal';
import { getFinanceV2Snapshot } from './balanceSheetService';
import { loadPayables } from './payableService';
import { createJournalEntry } from './journalService';
import { findSystemAccount } from './accountService';

function monthStart(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function monthEnd(monthIso: string): string {
  const year = Number(monthIso.slice(0, 4));
  const month = Number(monthIso.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export async function closeFinancePeriod(input: {
  orgId: string;
  periodMonth?: string;
  closedBy?: string;
}): Promise<{ snapshotId: string }> {
  const period = input.periodMonth || monthStart();
  const periodEnd = monthEnd(period);

  const { data: existing } = await supabase
    .from('planner_finance_period_snapshots')
    .select('id')
    .eq('org_id', input.orgId)
    .eq('period_month', period)
    .maybeSingle();

  if (existing?.id) {
    throw new Error('Periode ini sudah ditutup.');
  }

  const [bundle, snap, payables] = await Promise.all([
    buildFinanceReportBundle({
      orgId: input.orgId,
      dateFrom: period,
      dateTo: periodEnd,
    }),
    getFinanceV2Snapshot(input.orgId),
    loadPayables(input.orgId),
  ]);

  const hutangOpen = payables.reduce((s, p) => s + (p.amount - p.paid_amount), 0);
  const snapshotJson = {
    period,
    profitLoss: bundle.profitLoss,
    balanceSheet: bundle.balanceSheet,
    cashFlow: bundle.cashFlow,
    totalKas: snap.accounts.filter(a => a.type === 'kas').reduce((s, a) => s + a.current_balance, 0),
    totalHutang: hutangOpen,
    closedAt: new Date().toISOString(),
  };

  const { data: row, error } = await supabase
    .from('planner_finance_period_snapshots')
    .insert({
      org_id: input.orgId,
      period_month: period,
      snapshot_json: snapshotJson,
      closed_by: input.closedBy || null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('planner_finance_report_runs').insert({
    org_id: input.orgId,
    period_from: period,
    period_to: periodEnd,
    report_kind: 'period_close',
    generated_by: input.closedBy || null,
    metadata: { snapshot_id: row.id },
  });

  const labaPeriode = await findSystemAccount(input.orgId, 'laba', 'periode');
  const labaDitahan = await findSystemAccount(input.orgId, 'laba_ditahan');
  if (labaPeriode && labaDitahan) {
    // Hitung laba periode yang sudah lebih dulu dipindahkan oleh tutup proyek (project_close) pada periode ini
    // agar tidak terjadi pemindahan ganda ke Laba Ditahan.
    const periodLines = await loadEnrichedJournalLines({
      orgId: input.orgId,
      dateFrom: period,
      dateTo: periodEnd,
    });
    const alreadyClosedByProjectClose = periodLines
      .filter(l => l.accountType === 'laba' && l.referenceType === 'project_close')
      .reduce((sum, l) => sum + (l.debit - l.credit), 0);

    const remainingProfit = toRupiah(bundle.profitLoss.netProfit - alreadyClosedByProjectClose);
    if (remainingProfit !== 0) {
      const abs = Math.abs(remainingProfit);
      await createJournalEntry({
        orgId: input.orgId,
        entryDate: periodEnd,
        description: `Tutup periode ${period.slice(0, 7)}`,
        referenceType: 'period_close',
        referenceId: row.id,
        createdBy: input.closedBy,
        lines: remainingProfit >= 0
          ? [
              { accountId: labaPeriode.id, debit: abs, credit: 0 },
              { accountId: labaDitahan.id, debit: 0, credit: abs },
            ]
          : [
              { accountId: labaDitahan.id, debit: abs, credit: 0 },
              { accountId: labaPeriode.id, debit: 0, credit: abs },
            ],
      });
    }
  }

  return { snapshotId: row.id as string };
}

export async function listPeriodSnapshots(orgId: string, limit = 12) {
  const { data, error } = await supabase
    .from('planner_finance_period_snapshots')
    .select('*')
    .eq('org_id', orgId)
    .order('period_month', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}
