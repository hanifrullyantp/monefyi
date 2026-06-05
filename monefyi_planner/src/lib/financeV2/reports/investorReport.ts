import { supabase } from '../../supabase';
import { calcDividend } from '../../financeV2AdvancedCalc';
import type { InvestorReportRow, ReportFilters } from './types';

export async function buildInvestorReport(
  filters: ReportFilters,
  periodProfit: number,
): Promise<InvestorReportRow[]> {
  const { data: investors, error: invErr } = await supabase
    .from('planner_investors')
    .select('*')
    .eq('org_id', filters.orgId)
    .eq('is_active', true);

  if (invErr) throw new Error(invErr.message);

  const rows: InvestorReportRow[] = [];

  for (const inv of investors || []) {
    let q = supabase
      .from('planner_investor_transactions')
      .select('*')
      .eq('investor_id', inv.id)
      .gte('trans_date', filters.dateFrom)
      .lte('trans_date', filters.dateTo);

    if (filters.projectId) q = q.eq('project_id', filters.projectId);

    const { data: txs, error: txErr } = await q;
    if (txErr) throw new Error(txErr.message);

    let invested = 0;
    let withdrawn = 0;
    let dividends = 0;
    for (const tx of txs || []) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'invest') invested += amt;
      else if (tx.type === 'withdraw') withdrawn += amt;
      else if (tx.type === 'dividend') dividends += amt;
    }

    const sharePct = inv.share_pct != null ? Number(inv.share_pct) : null;
    rows.push({
      investorId: inv.id as string,
      investorName: inv.name as string,
      invested: round(invested),
      withdrawn: round(withdrawn),
      dividends: round(dividends),
      sharePct,
      suggestedDividend: sharePct ? calcDividend(periodProfit, sharePct) : 0,
    });
  }

  return rows.sort((a, b) => b.invested - a.invested);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
