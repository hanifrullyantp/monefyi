import type { Project } from '../../../store/appStore';
import type { BudgetExternalData } from '../../../types/budgetUsaha';
import { slotCost } from '../../../lib/laborCostCalculator';
import { getFinanceV2Snapshot } from '../balanceSheetService';
import { loadRapItems } from '../../rapService';
import { loadLaborSlots } from '../../laborAssignmentService';
import { listMembers } from '../../memberService';
import { listCompensation } from '../../payrollService';
import { aggregateRevenue } from './revenueAggregator';

const ACTIVE_STATUSES = new Set(['active', 'planning']);

async function aggregateHRPayroll(orgId: string): Promise<BudgetExternalData['hrPayroll']> {
  const [members, compensations] = await Promise.all([
    listMembers(orgId),
    listCompensation(orgId),
  ]);

  const compByMember = new Map(compensations.map(c => [c.member_id, c]));
  const activeMembers = members.filter(m => m.status === 'active' && m.role !== 'worker');

  const rows = activeMembers.map(m => {
    const comp = compByMember.get(m.id);
    const monthlySalary =
      comp?.salary_type === 'monthly'
        ? comp.monthly_salary
        : (comp?.daily_rate ?? 0) * 22;
    return {
      memberId: m.id,
      name: m.profile?.name ?? 'Karyawan',
      position: m.position,
      department: m.department,
      monthlySalary,
    };
  });

  return {
    totalMonthly: rows.reduce((s, r) => s + r.monthlySalary, 0),
    members: rows,
  };
}

async function aggregateRAPCosts(
  orgId: string,
  projects: Project[],
): Promise<BudgetExternalData['rapCosts']> {
  const active = projects.filter(p => ACTIVE_STATUSES.has(p.status));
  let materialTotal = 0;
  let laborPlanned = 0;
  let laborActual = 0;
  const byProject: BudgetExternalData['rapCosts']['byProject'] = [];

  for (const project of active) {
    const [rapItems, slots] = await Promise.all([
      loadRapItems(project.id),
      loadLaborSlots(project.id),
    ]);

    const material = rapItems
      .filter(r => r.type === 'material')
      .reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);

    const laborFromRap = rapItems
      .filter(r => r.type === 'labor' || r.type === 'tenaga')
      .reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);

    const plannedSlots = slots
      .filter(s => s.slot_kind === 'planned')
      .reduce((sum, sl) => sum + slotCost(sl), 0);
    const actualSlots = slots
      .filter(s => s.slot_kind === 'actual')
      .reduce((sum, sl) => sum + slotCost(sl), 0);

    const laborPlan = Math.max(laborFromRap, plannedSlots);
    const laborAct = actualSlots;

    materialTotal += material;
    laborPlanned += laborPlan;
    laborActual += laborAct;

    byProject.push({
      projectId: project.id,
      projectName: project.name,
      material,
      laborPlanned: laborPlan,
      laborActual: laborAct,
    });
  }

  const months = 12;
  return {
    materialMonthly: materialTotal / months,
    laborMonthly: laborPlanned / months,
    byProject,
  };
}

/** Pull all external module data for budget calculation. */
export async function pullExternalData(
  orgId: string,
  projects: Project[],
  year: number,
): Promise<BudgetExternalData> {
  const [revenue, hrPayroll, rapCosts, finance] = await Promise.all([
    aggregateRevenue(orgId, projects, year),
    aggregateHRPayroll(orgId),
    aggregateRAPCosts(orgId, projects),
    getFinanceV2Snapshot(orgId),
  ]);

  const kasBalance = finance.accounts
    .filter(a => a.type === 'kas')
    .reduce((s, a) => s + a.current_balance, 0);

  return { revenue, hrPayroll, rapCosts, kasBalance };
}
