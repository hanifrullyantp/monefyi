import { groupTodayByUser } from './attendanceService';
import { listMembers } from './memberService';
import type { Project } from '../store/appStore';

export async function getTodayAttendanceSummary(orgId: string) {
  const [grouped, members] = await Promise.all([
    groupTodayByUser(orgId),
    listMembers(orgId),
  ]);
  const memberIds = new Set(members.map(m => m.user_id));
  let present = 0;
  let absent = 0;
  for (const id of memberIds) {
    const g = grouped[id];
    if (g?.checkIn && !g?.checkOut) present += 1;
    else if (!g?.checkIn) absent += 1;
  }
  return { present, absent, total: memberIds.size, grouped, members };
}

export function buildAttentionItems(projects: Project[]) {
  const items: Array<{
    severity: 'critical' | 'high' | 'medium';
    title: string;
    message: string;
    projectId?: string;
    projectName?: string;
  }> = [];

  for (const p of projects) {
    const budgetPct = p.total_budget_planned
      ? (p.spent_amount / p.total_budget_planned) * 100
      : 0;
    if (budgetPct >= 85 && p.progress_percentage < 70) {
      items.push({
        severity: budgetPct >= 95 ? 'critical' : 'high',
        title: `Budget ${p.name}`,
        message: `Tersisa ${Math.max(0, 100 - budgetPct).toFixed(0)}% budget, progress ${p.progress_percentage.toFixed(0)}%`,
        projectId: p.id,
        projectName: p.name,
      });
    }
    if (p.health_status === 'behind') {
      items.push({
        severity: 'high',
        title: `Proyek terlambat`,
        message: p.name,
        projectId: p.id,
        projectName: p.name,
      });
    }
    if (p.health_status === 'at_risk') {
      items.push({
        severity: 'medium',
        title: `Perlu perhatian`,
        message: p.name,
        projectId: p.id,
        projectName: p.name,
      });
    }
  }
  const order = { critical: 0, high: 1, medium: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 10);
}
