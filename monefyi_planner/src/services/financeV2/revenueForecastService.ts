import { supabase } from '../../lib/supabase';

export type RevenueForecast = {
  id: string;
  org_id: string;
  project_id: string | null;
  period_month: string;
  planned_amount: number;
  notes: string | null;
  updated_at: string;
};

function mapRow(row: Record<string, unknown>): RevenueForecast {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    project_id: (row.project_id as string) || null,
    period_month: row.period_month as string,
    planned_amount: Number(row.planned_amount) || 0,
    notes: (row.notes as string) || null,
    updated_at: row.updated_at as string,
  };
}

export async function loadRevenueForecasts(
  orgId: string,
  periodMonth: string,
): Promise<RevenueForecast[]> {
  const { data, error } = await supabase
    .from('planner_finance_revenue_forecasts')
    .select('*')
    .eq('org_id', orgId)
    .eq('period_month', periodMonth)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(r => mapRow(r as Record<string, unknown>));
}

export async function upsertRevenueForecast(input: {
  orgId: string;
  projectId?: string | null;
  periodMonth: string;
  plannedAmount: number;
  notes?: string;
}): Promise<RevenueForecast> {
  const { data, error } = await supabase
    .from('planner_finance_revenue_forecasts')
    .upsert(
      {
        org_id: input.orgId,
        project_id: input.projectId || null,
        period_month: input.periodMonth,
        planned_amount: input.plannedAmount,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,project_id,period_month' },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function deleteRevenueForecast(id: string): Promise<void> {
  const { error } = await supabase
    .from('planner_finance_revenue_forecasts')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Simple 3-month cash forecast from opex budget + revenue forecasts.
 */
export async function buildCashForecast(orgId: string, startMonth: string): Promise<{
  months: Array<{ period: string; inflow: number; outflow: number; net: number; cumulative: number }>;
}> {
  const months: string[] = [];
  const d = new Date(`${startMonth}T00:00:00`);
  for (let i = 0; i < 3; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`);
  }

  let cumulative = 0;
  const result = [];
  for (const period of months) {
    const month = parseInt(period.slice(5, 7), 10);
    const year = parseInt(period.slice(0, 4), 10);

    const [{ data: budgets }, { data: forecasts }] = await Promise.all([
      supabase
        .from('planner_opex_budgets')
        .select('planned_amount')
        .eq('org_id', orgId)
        .eq('period_month', month)
        .eq('period_year', year),
      supabase
        .from('planner_finance_revenue_forecasts')
        .select('planned_amount')
        .eq('org_id', orgId)
        .eq('period_month', period),
    ]);

    const inflow = (forecasts || []).reduce((s, r) => s + (Number(r.planned_amount) || 0), 0);
    const outflow = (budgets || []).reduce((s, r) => s + (Number(r.planned_amount) || 0), 0);
    const net = inflow - outflow;
    cumulative += net;
    result.push({ period, inflow, outflow, net, cumulative });
  }

  return { months: result };
}
