import { supabase } from '../../lib/supabase';
import { monthStartIso } from '../payrollService';

export type PayrollAllocationLine =
  | { kind: 'project'; projectId: string; projectName?: string; amount: number; weight: number }
  | { kind: 'opex'; amount: number; reason?: string };

export type PayrollAllocation = {
  userId: string;
  memberRole: string;
  periodMonth: string;
  totalAmount: number;
  lines: PayrollAllocationLine[];
  method: 'labor_slots' | 'org_opex';
};

function periodBounds(periodMonth: string) {
  const start = periodMonth.slice(0, 10);
  const d = new Date(`${start}T00:00:00Z`);
  const endMonth = d.getUTCMonth() === 11 ? 0 : d.getUTCMonth() + 1;
  const endYear = d.getUTCMonth() === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
  const end = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;
  return { start, end };
}

function slotCost(slot: Record<string, unknown>): number {
  const rate = Number(slot.unit_rate) || 0;
  const dayFrac = Number(slot.day_fraction) || 0;
  const regH = Number(slot.regular_hours) || 0;
  const otH = Number(slot.overtime_hours) || 0;
  if (slot.rate_type === 'hourly') return Math.round(rate * (regH + otH * 1.5));
  if (slot.rate_type === 'monthly') return Math.round(rate * dayFrac);
  return Math.round(rate * (dayFrac || 1));
}

/**
 * Hybrid payroll allocation: field workers → project HPP by labor slots; others → opex.
 */
export async function buildPayrollAllocation(input: {
  orgId: string;
  userId: string;
  periodMonth: string;
  netAmount: number;
}): Promise<PayrollAllocation> {
  const { orgId, userId, periodMonth, netAmount } = input;
  if (netAmount <= 0) {
    return {
      userId,
      memberRole: 'unknown',
      periodMonth,
      totalAmount: 0,
      lines: [],
      method: 'org_opex',
    };
  }

  const { data: member } = await supabase
    .from('planner_org_members')
    .select('id, role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const role = (member?.role as string) || 'worker';
  const memberId = member?.id as string | undefined;
  const isFieldWorker = role === 'worker';

  if (!isFieldWorker) {
    return {
      userId,
      memberRole: role,
      periodMonth,
      totalAmount: netAmount,
      lines: [{ kind: 'opex', amount: netAmount, reason: 'Gaji administrasi / non-lapangan' }],
      method: 'org_opex',
    };
  }

  const { start, end } = periodBounds(periodMonth);

  const { data: slots } = await supabase
    .from('planner_labor_slots')
    .select('project_id, member_id, unit_rate, day_fraction, regular_hours, overtime_hours, rate_type, planner_projects(name)')
    .eq('org_id', orgId)
    .gte('work_date', start)
    .lt('work_date', end);

  const filtered = memberId
    ? (slots || []).filter(s => s.member_id === memberId)
    : [];

  const weightByProject = new Map<string, { weight: number; name?: string }>();
  for (const slot of filtered) {
    const pid = slot.project_id as string;
    const w = slotCost(slot as Record<string, unknown>);
    if (w <= 0) continue;
    const prev = weightByProject.get(pid) || { weight: 0, name: undefined };
    const proj = slot.planner_projects as { name?: string } | null;
    weightByProject.set(pid, {
      weight: prev.weight + w,
      name: proj?.name || prev.name,
    });
  }

  const totalWeight = [...weightByProject.values()].reduce((s, v) => s + v.weight, 0);
  if (totalWeight <= 0) {
    return {
      userId,
      memberRole: role,
      periodMonth,
      totalAmount: netAmount,
      lines: [{ kind: 'opex', amount: netAmount, reason: 'Tukang tanpa slot proyek — dialokasikan ke opex' }],
      method: 'org_opex',
    };
  }

  const lines: PayrollAllocationLine[] = [];
  let allocated = 0;
  const entries = [...weightByProject.entries()];
  entries.forEach(([projectId, meta], idx) => {
    const isLast = idx === entries.length - 1;
    const amount = isLast
      ? netAmount - allocated
      : Math.round((meta.weight / totalWeight) * netAmount);
    allocated += amount;
    if (amount > 0) {
      lines.push({
        kind: 'project',
        projectId,
        projectName: meta.name,
        amount,
        weight: meta.weight,
      });
    }
  });

  return {
    userId,
    memberRole: role,
    periodMonth,
    totalAmount: netAmount,
    lines,
    method: 'labor_slots',
  };
}

export { monthStartIso };
