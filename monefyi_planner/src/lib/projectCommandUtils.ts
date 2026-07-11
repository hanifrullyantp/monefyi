import type { Project } from '../../store/appStore';
import type { AnalyzeResult } from '../../services/analyzeService';
import type { WorkItem } from '../../services/workItemService';
import type { DailyLog } from '../../services/dailyLogService';
import type { TabBadges } from '../../components/projects/command-center/types';

export interface SCurvePoint {
  week: string;
  planned: number;
  actual: number;
  date?: string;
}

export interface UpcomingDeadline {
  id: string;
  label: string;
  date: string;
  daysLeft: number;
  severity: 'overdue' | 'urgent' | 'ok';
}

export interface RuleInsight {
  id: string;
  icon: string;
  title: string;
  message: string;
  tab?: string;
  severity: 'critical' | 'warning' | 'info';
}

/** Build S-curve data from EVM + work items. */
export function buildSCurveData(
  project: Project,
  workItems: WorkItem[],
  analysis: AnalyzeResult | null,
): SCurvePoint[] {
  if (analysis?.evm) {
    const { planned_progress, actual_progress } = analysis.evm;
    const steps = Math.max(workItems.length, 4);
    return Array.from({ length: steps }, (_, i) => {
      const t = (i + 1) / steps;
      return {
        week: workItems[i]?.name?.slice(0, 10) || `P${i + 1}`,
        planned: Math.min(100, planned_progress * t * (1 + 0.05 * Math.sin(i))),
        actual: Math.min(100, actual_progress * t * (0.85 + 0.15 * t)),
      };
    });
  }

  if (workItems.length) {
    return workItems.slice(0, 12).map((wi, i) => ({
      week: wi.name.slice(0, 10) || `W${i + 1}`,
      planned: Math.min(100, ((i + 1) / workItems.length) * 100),
      actual: Number(wi.progress_pct) || 0,
    }));
  }

  return [{
    week: 'Now',
    planned: project.planned_progress ?? 0,
    actual: project.progress_percentage,
  }];
}

/** Rule-based insights (Phase 1 — no LLM). */
export function buildRuleInsights(
  project: Project,
  budgetPct: number,
  daysLeft: number,
  analysis: AnalyzeResult | null,
  piutangOutstanding: number,
): RuleInsight[] {
  const insights: RuleInsight[] = [];
  const progress = project.progress_percentage;

  if (daysLeft < 0) {
    insights.push({
      id: 'late',
      icon: '⚠️',
      title: 'Proyek terlambat',
      message: `Proyek sudah lewat deadline ${Math.abs(daysLeft)} hari dari jadwal.`,
      tab: 'realisasi',
      severity: 'critical',
    });
  } else if (daysLeft <= 3) {
    insights.push({
      id: 'deadline-soon',
      icon: '📅',
      title: 'Deadline mendekat',
      message: `Sisa ${daysLeft} hari — percepat pekerjaan kritis.`,
      tab: 'planning',
      severity: 'warning',
    });
  }

  if (budgetPct > progress + 10) {
    insights.push({
      id: 'cpi-bad',
      icon: '💰',
      title: 'Budget over burn',
      message: `Budget terpakai ${Math.round(budgetPct)}% tapi progress baru ${Math.round(progress)}% — efisiensi biaya perlu diperhatikan.`,
      tab: 'realisasi',
      severity: 'critical',
    });
  }

  if (piutangOutstanding > 0) {
    insights.push({
      id: 'piutang',
      icon: '🔔',
      title: 'Piutang belum lunas',
      message: `Sisa tagihan klien ${piutangOutstanding > 1e6 ? `${(piutangOutstanding / 1e6).toFixed(1)}jt` : piutangOutstanding} belum diterima.`,
      tab: 'realisasi',
      severity: 'warning',
    });
  }

  if (analysis?.recommendations?.length) {
    for (const rec of analysis.recommendations.slice(0, 2)) {
      insights.push({
        id: `ai-${rec.title}`,
        icon: rec.severity === 'critical' ? '🔴' : '💡',
        title: rec.title,
        message: rec.message,
        tab: 'overview',
        severity: rec.severity === 'critical' ? 'critical' : 'info',
      });
    }
  }

  if (!insights.length) {
    insights.push({
      id: 'ok',
      icon: '✅',
      title: 'Proyek dalam kontrol',
      message: 'Tidak ada isu kritis terdeteksi. Lanjutkan monitoring rutin.',
      severity: 'info',
    });
  }

  return insights;
}

export function buildUpcomingDeadlines(
  project: Project,
  workItems: WorkItem[],
): UpcomingDeadline[] {
  const now = Date.now();
  const items: UpcomingDeadline[] = [];

  const projectEnd = new Date(project.end_date).getTime();
  const projDays = Math.ceil((projectEnd - now) / 86400000);
  items.push({
    id: 'project-end',
    label: 'Deadline proyek',
    date: project.end_date,
    daysLeft: projDays,
    severity: projDays < 0 ? 'overdue' : projDays <= 3 ? 'urgent' : 'ok',
  });

  for (const wi of workItems) {
    if (Number(wi.progress_pct) >= 100) continue;
    const end = new Date(wi.planned_end || wi.planned_start).getTime();
    const days = Math.ceil((end - now) / 86400000);
    items.push({
      id: wi.id,
      label: wi.name,
      date: wi.planned_end || wi.planned_start,
      daysLeft: days,
      severity: days < 0 ? 'overdue' : days <= 3 ? 'urgent' : 'ok',
    });
  }

  return items
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);
}

export function computeTabBadges(
  workItems: WorkItem[],
  materialCount: number,
  piutangOutstanding: number,
  debtOwed: number,
): TabBadges {
  const pendingTasks = workItems.filter(w => Number(w.progress_pct) < 100).length;
  const hpPending = (piutangOutstanding > 0 ? 1 : 0) + (debtOwed > 0 ? 1 : 0);

  return {
    planning: pendingTasks || undefined,
    realisasi: hpPending || undefined,
    bahan: materialCount || undefined,
  };
}

export function mergeActivityFeed(
  logs: DailyLog[],
  costs: { date: string; description?: string; total_amount?: number }[],
): { id: string; text: string; time: string; kind: string }[] {
  const entries = [
    ...logs.map(l => ({
      id: l.id,
      text: l.description || 'Update progress',
      time: l.created_at || l.date,
      kind: 'progress',
    })),
    ...costs.slice(0, 10).map(c => ({
      id: `cost-${c.date}-${c.description}`,
      text: c.description || 'Biaya tercatat',
      time: c.date,
      kind: 'finance',
    })),
  ];

  return entries
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);
}
