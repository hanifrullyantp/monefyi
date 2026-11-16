import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Calendar, Check, CheckCircle2,
  Clock, Copy, GanttChart, List, Loader2, Plus, Route, Save, Trash2, TrendingDown, TrendingUp, User,
} from 'lucide-react';
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';
import {
  createWorkItem,
  deleteWorkItem,
  duplicateWorkItem,
  isWorkItemConflictError,
  loadDemoWorkItems,
  saveDemoWorkItems,
  updateWorkItem,
  updateWorkItemExtendedMeta,
  updateProjectProgressFromWorkItems,
  type WorkItem,
  type WorkItemExtendedMeta,
} from '../../../services/workItemService';
import { updateProject as updateProjectApi } from '../../../services/projectService';
import { createDailyLog, loadDailyLogs, type DailyLog } from '../../../services/dailyLogService';
import { listMembers } from '../../../services/memberService';
import type { OrgMember } from '../../../types/onboarding';
import { PRIORITY_BADGE_COLOR, PRIORITY_LABEL } from '../../../lib/gantt/constants';
import { computeWorkItemsCriticalPath } from '../../../lib/gantt/criticalPath';
import type { GanttPriority } from '../../../lib/gantt/types';
import {
  getDeadlineOverrunDays,
  isTaskOverProjectDeadline,
  workItemToGanttTask,
} from '../../../lib/gantt/utils';
import {
  buildSCurveFromWorkItems,
  computeProgressSummary,
  schedulePlanProgress,
  weightedActualProgress,
  workItemStatusLabel,
} from '../../../lib/progressMetrics';
import { buildUpcomingDeadlines } from '../../../lib/projectCommandUtils';
import { formatDateId, daysUntil } from '../../../utils/projectUi';
import { showToast } from '../../../store/uiStore';
import BottomActionBar from '../../sandbox-ui/BottomActionBar';
import ProjectScheduleGantt from './ProjectScheduleGantt';
import GanttAddWorkItemModal, { type GanttAddWorkItemPayload } from '../gantt/GanttAddWorkItemModal';

type ViewMode = 'list' | 'gantt';

type ProgressRow = {
  key: string;
  workItem?: WorkItem;
  name: string;
  weight: number;
  progress: number;
  planProgress: number;
  status: 'done' | 'active' | 'pending';
  start: string;
  end: string;
};

const PRIORITY_OPTIONS: GanttPriority[] = ['low', 'medium', 'high', 'critical'];

const DEMO_PROGRESS_MEMBERS: OrgMember[] = [
  {
    id: 'demo-m-1',
    org_id: 'demo',
    user_id: 'demo-u-1',
    role: 'owner',
    status: 'active',
    profile: { name: 'Budi Santoso' },
  },
  {
    id: 'demo-m-2',
    org_id: 'demo',
    user_id: 'demo-u-2',
    role: 'manager',
    status: 'active',
    profile: { name: 'Sari Dewi' },
  },
  {
    id: 'demo-m-3',
    org_id: 'demo',
    user_id: 'demo-u-3',
    role: 'worker',
    status: 'active',
    profile: { name: 'Ahmad Rizky' },
  },
];

function memberDisplayName(m: OrgMember): string {
  return m.profile?.name || m.employee_id || m.position || 'Anggota';
}

type Props = {
  normalized: NormalizedProjectView;
  project: Project;
  workItems: WorkItem[];
  userId: string;
  canManage?: boolean;
  onRefresh: () => void | Promise<void>;
};

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function StatusBadge({ status }: { status: ReturnType<typeof workItemStatusLabel> }) {
  const map = {
    done: 'bg-emerald-100 text-emerald-700',
    active: 'bg-blue-100 text-blue-700',
    overdue: 'bg-rose-100 text-rose-700',
    pending: 'bg-slate-100 text-slate-600',
  };
  const label = {
    done: 'Selesai',
    active: 'Berjalan',
    overdue: 'Terlambat',
    pending: 'Belum mulai',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export default function TabV2Progress({
  normalized, project, workItems, userId, canManage = true, onRefresh,
}: Props) {
  const updateProject = useAppStore(s => s.updateProject);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const tenant = useAppStore(s => s.tenant);
  const isDemoProject = isDemoOrInvalidUuid(
    project.id,
    Boolean(isDemoMode || tenant?.id === 'demo'),
  );
  const isDemoOrg = !tenant?.id || isDemoOrInvalidUuid(tenant.id, isDemoMode);

  const [view, setView] = useState<ViewMode>('list');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [extendingDeadline, setExtendingDeadline] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ workItemId: '', description: '', progress: '' });
  const [logSaving, setLogSaving] = useState(false);

  const summary = useMemo(() => computeProgressSummary(project, workItems), [project, workItems]);
  const sCurve = useMemo(() => buildSCurveFromWorkItems(project, workItems), [project, workItems]);
  const deadlines = useMemo(() => buildUpcomingDeadlines(project, workItems), [project, workItems]);

  const workItemsById = useMemo(
    () => new Map<string, WorkItem>(workItems.map(w => [w.id, w])),
    [workItems],
  );

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.id, memberDisplayName(m));
    }
    return map;
  }, [members]);

  const cpm = useMemo(
    () => computeWorkItemsCriticalPath(project.id, workItems),
    [project.id, workItems],
  );

  const ganttTasks = useMemo(
    () => workItems.map(wi => workItemToGanttTask(wi, project, memberNameMap)),
    [workItems, project, memberNameMap],
  );

  const overDeadlineItems = useMemo(
    () => workItems.filter(w => isTaskOverProjectDeadline(w.planned_end, project.end_date)),
    [workItems, project.end_date],
  );

  const maxOverrunEndDate = useMemo(() => {
    if (overDeadlineItems.length === 0) return '';
    return overDeadlineItems.reduce((max, w) => {
      const end = (w.planned_end || '').slice(0, 10);
      return end > max ? end : max;
    }, (project.end_date || '').slice(0, 10));
  }, [overDeadlineItems, project.end_date]);

  const timelineRows = useMemo<ProgressRow[]>(() => {
    if (workItems.length > 0) {
      return workItems.map(w => {
        const wi = workItemsById.get(w.id) ?? w;
        const statusLabel = workItemStatusLabel(wi);
        return {
          key: wi.id,
          workItem: wi,
          name: wi.name,
          weight: Number(wi.weight) || 10,
          progress: Number(wi.progress_pct) || 0,
          planProgress: schedulePlanProgress(wi.planned_start, wi.planned_end),
          status: statusLabel === 'done' ? 'done' : statusLabel === 'active' ? 'active' : 'pending',
          start: wi.planned_start,
          end: wi.planned_end,
        };
      });
    }
    return normalized.project.timeline.map(t => ({
      key: `timeline-${t.id}`,
      workItem: undefined,
      name: t.name,
      weight: t.weight,
      progress: t.progress,
      planProgress: t.planProgress,
      status: t.status === 'done' ? 'done' : t.status === 'active' ? 'active' : 'pending',
      start: t.start,
      end: t.end,
    }));
  }, [workItems, workItemsById, normalized.project.timeline]);

  useEffect(() => {
    if (isDemoOrg) {
      setMembers(DEMO_PROGRESS_MEMBERS);
      return;
    }
    if (!tenant?.id) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    listMembers(tenant.id)
      .then(list => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemoOrg, tenant?.id]);

  const reloadLogs = useCallback(async () => {
    if (isDemoProject) return;
    try {
      setLogs(await loadDailyLogs(project.id));
    } catch {
      /* non-blocking */
    }
  }, [project.id, isDemoProject]);

  useEffect(() => { void reloadLogs(); }, [reloadLogs]);

  const syncProjectProgress = useCallback(async () => {
    if (isDemoProject) {
      const demoItems = loadDemoWorkItems(project.id);
      if (demoItems.length > 0) {
        updateProject(project.id, {
          progress_percentage: weightedActualProgress(demoItems),
          planned_progress: summary.plan,
        });
      }
    } else {
      const avg = await updateProjectProgressFromWorkItems(project.id);
      if (avg != null) {
        updateProject(project.id, { progress_percentage: avg, planned_progress: summary.plan });
      }
    }
    await onRefresh();
  }, [isDemoProject, project.id, summary.plan, updateProject, onRefresh]);

  const handleSaveProgress = async (wiId: string, rawPct: number) => {
    const pct = clampPct(rawPct);
    const targetWi = workItemsById.get(wiId);
    setSavingId(wiId);
    try {
      await updateWorkItem(
        wiId,
        {
          progress_pct: pct,
          status: pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending',
        },
        { expectedUpdatedAt: targetWi?.updated_at },
      );
      setDrafts(d => {
        const next = { ...d };
        delete next[wiId];
        return next;
      });
      await syncProjectProgress();
      showToast(`Progress diperbarui → ${pct}%`, 'success');
    } catch (e) {
      if (isWorkItemConflictError(e)) {
        setDrafts(d => {
          const next = { ...d };
          delete next[wiId];
          return next;
        });
        showToast(
          'Konflik perubahan: progress pekerjaan telah diperbarui pengguna lain. Memuat ulang data terbaru...',
          'error',
        );
        await onRefresh();
      } else {
        showToast(e instanceof Error ? e.message : 'Gagal update progress', 'error');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleAddWorkItem = async (data: GanttAddWorkItemPayload) => {
    try {
      await createWorkItem({
        project_id: project.id,
        name: data.name,
        planned_start: data.planned_start,
        planned_end: data.planned_end,
        progress_pct: data.progress_pct,
        priority: data.priority ?? 'medium',
        assigned_member_id: data.assigned_member_id ?? null,
        dependencies: data.dependencies ?? [],
        dependency_type: 'FS',
        parent_id: data.parent_id ?? null,
        weight: 10,
        status:
          data.progress_pct >= 100
            ? 'completed'
            : data.progress_pct > 0
              ? 'in_progress'
              : 'pending',
        sort_order: workItems.length,
      });
      await syncProjectProgress();
      showToast('Pekerjaan ditambahkan', 'success');
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah pekerjaan', 'error');
      return false;
    }
  };

  const handleDuplicateWorkItem = async (wi: WorkItem) => {
    setActionBusyId(wi.id);
    try {
      const duplicated = await duplicateWorkItem(wi);
      if (isDemoProject || isDemoOrInvalidUuid(wi.id, isDemoMode)) {
        const stored = loadDemoWorkItems(project.id);
        if (!stored.some(item => item.id === duplicated.id)) {
          saveDemoWorkItems(project.id, [...workItems, duplicated]);
        }
      }
      await syncProjectProgress();
      showToast('Pekerjaan diduplikasi', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menduplikasi pekerjaan', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteWorkItem = async (wi: WorkItem) => {
    setActionBusyId(wi.id);
    try {
      await deleteWorkItem(wi.id);
      if (isDemoProject || isDemoOrInvalidUuid(wi.id, isDemoMode)) {
        const nextDemo = workItems
          .filter(w => w.id !== wi.id && w.parent_id !== wi.id)
          .map(w =>
            w.dependencies?.includes(wi.id)
              ? { ...w, dependencies: w.dependencies.filter(id => id !== wi.id) }
              : w,
          );
        saveDemoWorkItems(project.id, nextDemo);
      }
      setConfirmDeleteId(null);
      await syncProjectProgress();
      showToast('Pekerjaan dihapus', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus pekerjaan', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleQuickMetaChange = async (wi: WorkItem, patch: WorkItemExtendedMeta) => {
    setActionBusyId(wi.id);
    try {
      const res = await updateWorkItemExtendedMeta(project.id, wi.id, patch);
      if (isDemoProject || isDemoOrInvalidUuid(wi.id, isDemoMode)) {
        const nextTimestamp = res.updated_at || new Date().toISOString();
        const stored = loadDemoWorkItems(project.id);
        const baseList = stored.length > 0 ? stored : workItems;
        saveDemoWorkItems(
          project.id,
          baseList.map(w =>
            w.id === wi.id ? { ...w, ...patch, updated_at: nextTimestamp } : w,
          ),
        );
      }
      await onRefresh();
      showToast('Detail pekerjaan diperbarui', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memperbarui pekerjaan', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleExtendProjectEndDate = useCallback(
    async (newEndDate: string): Promise<boolean> => {
      if (!newEndDate) return false;
      setExtendingDeadline(true);
      try {
        if (!isDemoProject) {
          await updateProjectApi(project.id, { end_date: newEndDate }, tenant?.currency);
        }
        updateProject(project.id, { end_date: newEndDate });
        await onRefresh();
        showToast(`Target proyek diperpanjang ke ${formatDateId(newEndDate)}`, 'success');
        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal memperpanjang target proyek', 'error');
        return false;
      } finally {
        setExtendingDeadline(false);
      }
    },
    [isDemoProject, project.id, tenant?.currency, updateProject, onRefresh],
  );

  const handleLogProgress = async () => {
    if (!logForm.description.trim()) {
      showToast('Deskripsi laporan wajib diisi', 'error');
      return;
    }
    const increment = logForm.progress ? Number(logForm.progress) : 0;
    setLogSaving(true);
    try {
      const targetWi = logForm.workItemId
        ? workItemsById.get(logForm.workItemId)
        : undefined;
      const logDesc = targetWi
        ? `[${targetWi.name}] ${logForm.description.trim()}`
        : logForm.description.trim();

      if (increment > 0 && targetWi) {
        const nextPct = clampPct((Number(targetWi.progress_pct) || 0) + increment);
        await updateWorkItem(
          targetWi.id,
          {
            progress_pct: nextPct,
            status: nextPct >= 100 ? 'completed' : nextPct > 0 ? 'in_progress' : 'pending',
          },
          { expectedUpdatedAt: targetWi.updated_at },
        );
      }

      if (isDemoProject) {
        const now = new Date().toISOString();
        setLogs(prev => [
          {
            id: `demo-log-${Date.now()}`,
            project_id: project.id,
            date: now.slice(0, 10),
            description: logDesc,
            progress_increment: increment,
            recorded_by: userId,
            created_at: now,
          },
          ...prev,
        ]);
      } else {
        await createDailyLog({
          project_id: project.id,
          date: new Date().toISOString().slice(0, 10),
          description: logDesc,
          progress_increment: increment,
          recorded_by: userId,
        });
      }

      if (increment > 0) {
        if (targetWi) {
          await syncProjectProgress();
        } else if (workItems.length === 0) {
          const nextPct = clampPct((Number(project.progress_percentage) || 0) + increment);
          if (!isDemoProject) {
            await updateProjectApi(project.id, { progress_percentage: nextPct });
          }
          updateProject(project.id, { progress_percentage: nextPct });
          await onRefresh();
        }
      }

      setLogForm({ workItemId: '', description: '', progress: '' });
      setLogOpen(false);
      await reloadLogs();
      showToast(
        increment > 0 ? `Laporan & progres (+${increment}%) tercatat` : 'Laporan harian tercatat',
        'success',
      );
    } catch (e) {
      if (isWorkItemConflictError(e)) {
        showToast(
          'Konflik perubahan: item pekerjaan ini telah diubah di tempat lain. Memuat ulang data terbaru...',
          'error',
        );
        await onRefresh();
      } else {
        showToast(e instanceof Error ? e.message : 'Gagal menyimpan laporan', 'error');
      }
    } finally {
      setLogSaving(false);
    }
  };

  const deviationTone = summary.deviation >= 0 ? 'text-emerald-200' : 'text-amber-200';

  return (
    <div className="space-y-5 pb-4">
      {overDeadlineItems.length > 0 && view === 'list' && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-amber-950">
                {overDeadlineItems.length} item jadwal melewati batas akhir proyek ({formatDateId(project.end_date)})
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Jadwal terjauh berakhir pada {formatDateId(maxOverrunEndDate)}.
              </p>
            </div>
          </div>
          {canManage && maxOverrunEndDate && (
            <button
              type="button"
              disabled={extendingDeadline}
              onClick={() => void handleExtendProjectEndDate(maxOverrunEndDate)}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-60 shrink-0"
            >
              {extendingDeadline ? 'Memperpanjang...' : 'Perpanjang Target Proyek'}
            </button>
          )}
        </div>
      )}

      {/* Hero */}
      <div className="rounded-2xl p-6 bg-emerald-800 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase opacity-80 flex items-center gap-1.5 mb-2">
              <Activity className="w-4 h-4" /> Progress Keseluruhan
            </div>
            <div className="text-5xl font-black tracking-tight">{summary.actual}%</div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-xs font-bold">
                Rencana {summary.plan}%
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-xs font-bold ${deviationTone}`}>
                {summary.deviation >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {summary.deviation >= 0 ? '+' : ''}{summary.deviation}% vs rencana
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-xs font-bold">
                SPI {summary.spi.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right text-sm opacity-90">
            <div className="font-bold">{daysUntil(project.end_date)} hari</div>
            <div className="text-xs opacity-75">sisa ke deadline</div>
            <div className="text-xs mt-1 opacity-75">{formatDateId(project.end_date)}</div>
          </div>
        </div>
        <div className="relative h-5 bg-white/15 rounded-full overflow-hidden mt-5">
          <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all" style={{ width: `${summary.plan}%` }} />
          <div className="absolute inset-y-0 left-0 bg-white rounded-full transition-all" style={{ width: `${summary.actual}%` }} />
        </div>
        <div className="flex justify-between text-xs opacity-80 mt-2">
          <span>Rencana jadwal</span>
          <span>Realisasi (bobot)</span>
        </div>
      </div>

      {/* KPI row — sinkron dengan dashboard cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Selesai" value={`${summary.completed}/${summary.total || '—'}`} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Berjalan" value={String(summary.inProgress)} icon={Activity} tone="blue" />
        <KpiCard label="Terlambat" value={String(summary.overdue)} icon={AlertTriangle} tone={summary.overdue > 0 ? 'rose' : 'slate'} />
        <KpiCard label="Hari Tersisa" value={String(summary.daysLeft)} icon={Clock} tone={summary.daysLeft < 0 ? 'rose' : 'slate'} />
      </div>

      {/* View toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg ${view === 'list' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
          >
            <List className="w-4 h-4" /> Daftar
          </button>
          <button
            type="button"
            onClick={() => setView('gantt')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg ${view === 'gantt' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
          >
            <GanttChart className="w-4 h-4" /> Gantt
          </button>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50">
              <Plus className="w-3.5 h-3.5" /> Pekerjaan
            </button>
            <button type="button" onClick={() => setLogOpen(v => !v)} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
              <Save className="w-3.5 h-3.5" /> Lapor Progress
            </button>
          </div>
        )}
      </div>

      {logOpen && canManage && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
          <h4 className="font-bold text-sm text-slate-800">Laporan Harian & Update Progress</h4>
          {workItems.length > 0 && (
            <select
              value={logForm.workItemId}
              onChange={e => setLogForm(f => ({ ...f, workItemId: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border text-sm bg-white"
            >
              <option value="">— Pilih Item Pekerjaan untuk Update % (Opsional) —</option>
              {workItems.map(wi => (
                <option key={wi.id} value={wi.id}>
                  {wi.name} (Saat ini: {Number(wi.progress_pct) || 0}%)
                </option>
              ))}
            </select>
          )}
          <textarea
            value={logForm.description}
            onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Contoh: Finishing kitchen cabinet, 3 tukang hadir"
            rows={2}
            className="w-full px-3 py-2 rounded-xl border text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={logForm.progress}
              onChange={e => setLogForm(f => ({ ...f, progress: e.target.value }))}
              placeholder="Progress +% (opsional)"
              className="w-40 px-3 py-2 rounded-xl border text-sm"
            />
            <button type="button" onClick={handleLogProgress} disabled={logSaving} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {logSaving ? 'Menyimpan...' : 'Simpan Laporan'}
            </button>
            <button type="button" onClick={() => setLogOpen(false)} className="px-4 py-2 border rounded-xl text-sm">Batal</button>
          </div>
        </div>
      )}

      {view === 'gantt' ? (
        <ProjectScheduleGantt project={project} workItems={workItems} onRefresh={() => void onRefresh()} />
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
            <Calendar className="w-5 h-5 text-slate-500" /> Pekerjaan & Progress
          </div>
          <div className="divide-y divide-slate-50">
            {timelineRows.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10 px-4">
                Belum ada pekerjaan. Tambah dari tombol di atas atau buka tab Gantt untuk jadwal visual.
              </p>
            ) : timelineRows.map(item => {
              const wi = item.workItem;
              const wiId = wi?.id;
              const draftVal = wiId ? (drafts[wiId] ?? String(item.progress)) : String(item.progress);
              const planPct = item.planProgress;
              const behind = item.progress < planPct - 5;
              const priority: GanttPriority = wi?.priority ?? 'medium';
              const priorityMeta = PRIORITY_BADGE_COLOR[priority] ?? PRIORITY_BADGE_COLOR.medium;
              const assigneeName = wi?.assigned_member_id
                ? memberNameMap.get(wi.assigned_member_id) || 'Anggota'
                : undefined;
              const cpmMetric = wi ? cpm.tasksById.get(wi.id) : undefined;
              const isOverDeadline = wi
                ? isTaskOverProjectDeadline(wi.planned_end, project.end_date)
                : false;
              const overrunDays = wi
                ? getDeadlineOverrunDays(wi.planned_end, project.end_date)
                : 0;
              const parentWi = wi?.parent_id ? workItemsById.get(wi.parent_id) : undefined;
              const rowBusy = Boolean(wi && (savingId === wi.id || actionBusyId === wi.id));

              return (
                <div
                  key={item.key}
                  className={`p-4 transition-colors ${
                    isOverDeadline
                      ? 'bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-50'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${item.status === 'done' ? 'bg-emerald-500' : behind ? 'bg-rose-500' : item.status === 'active' ? 'bg-blue-500' : 'bg-slate-200'
                      }`}>
                      {item.status === 'done' ? <Check className="w-4 h-4 text-white" /> : (
                        <span className="text-[10px] font-black text-white">{item.progress}%</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-800">{item.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Bobot {item.weight}%
                        </span>
                        {wi && <StatusBadge status={workItemStatusLabel(wi)} />}
                        {wi && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityMeta.badgeClass}`}>
                            {PRIORITY_LABEL[priority] ?? priorityMeta.label}
                          </span>
                        )}
                        {cpmMetric?.isCritical ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-0.5">
                            <Route className="w-3 h-3" /> Jalur Kritis
                          </span>
                        ) : cpmMetric && cpmMetric.totalFloatDays > 0 ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Float {cpmMetric.totalFloatDays}h
                          </span>
                        ) : null}
                        {wi && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                              assigneeName
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <User className="w-3 h-3" />
                            {assigneeName || 'Belum ditugaskan'}
                          </span>
                        )}
                        {parentWi && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Sub dari {parentWi.name}
                          </span>
                        )}
                        {isOverDeadline && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Lewat Deadline (+{overrunDays}h)
                          </span>
                        )}
                        {behind && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />-{planPct - item.progress}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDateId(item.start)} – {formatDateId(item.end)}
                        {' · '}Rencana {planPct}%
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2 relative">
                        <div className="absolute inset-y-0 left-0 bg-blue-200/60 rounded-full" style={{ width: `${planPct}%` }} />
                        <div className={`h-full rounded-full relative ${item.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${item.progress}%` }} />
                      </div>

                      {canManage && wi && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Penanggung jawab ${wi.name}`}
                            value={wi.assigned_member_id || ''}
                            disabled={rowBusy}
                            onChange={e =>
                              void handleQuickMetaChange(wi, {
                                assigned_member_id: e.target.value || null,
                              })
                            }
                            className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
                          >
                            <option value="">Belum ditugaskan</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>
                                {memberDisplayName(m)}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label={`Prioritas ${wi.name}`}
                            value={priority}
                            disabled={rowBusy}
                            onChange={e =>
                              void handleQuickMetaChange(wi, {
                                priority: e.target.value as GanttPriority,
                              })
                            }
                            className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
                          >
                            {PRIORITY_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>
                                {PRIORITY_LABEL[opt] || opt}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => void handleDuplicateWorkItem(wi)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            <Copy className="w-3.5 h-3.5" /> Duplikasi
                          </button>
                          {confirmDeleteId === wi.id ? (
                            <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                              <span className="text-[11px] font-semibold text-rose-700">Yakin hapus?</span>
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() => void handleDeleteWorkItem(wi)}
                                className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 disabled:opacity-50"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600 text-[11px] font-semibold hover:bg-slate-50"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => setConfirmDeleteId(wi.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {canManage && wiId && (
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Number(draftVal) || 0}
                          disabled={rowBusy}
                          onChange={e => setDrafts(d => ({ ...d, [wiId]: e.target.value }))}
                          className="w-28 accent-emerald-600"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={draftVal}
                          disabled={rowBusy}
                          onChange={e => setDrafts(d => ({ ...d, [wiId]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void handleSaveProgress(wiId, Number(draftVal));
                          }}
                          className="w-14 px-2 py-1 border rounded-lg text-center text-sm"
                        />
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => void handleSaveProgress(wiId, Number(draftVal))}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                          {savingId === wiId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* S-Curve */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
          <BarChart3 className="w-5 h-5 text-emerald-600" /> Kurva S (Kumulatif)
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sCurve} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v: any) => [`${v ?? 0}%`, '']} />
              <Legend />
              <Area type="monotone" dataKey="planned" name="Rencana" stroke="#2563EB" fill="#2563EB" fillOpacity={0.08} strokeWidth={2} />
              <Line type="monotone" dataKey="actual" name="Aktual" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Deadlines */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b font-bold text-slate-800 text-sm">Deadline Mendatang</div>
          <div className="divide-y divide-slate-50">
            {deadlines.length === 0 ? (
              <p className="text-xs text-slate-500 p-4">Tidak ada deadline.</p>
            ) : deadlines.map(d => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-800">{d.label}</div>
                  <div className="text-xs text-slate-500">{formatDateId(d.date)}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${d.severity === 'overdue' ? 'bg-rose-100 text-rose-700'
                  : d.severity === 'urgent' ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                  {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}h telat` : `${d.daysLeft}h`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b font-bold text-slate-800 text-sm">Riwayat Laporan</div>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 p-4">Belum ada laporan harian.</p>
            ) : logs.slice(0, 8).map(log => (
              <div key={log.id} className="px-5 py-3 text-sm">
                <div className="text-slate-800">{log.description}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                  <span>{formatDateId(log.date)}</span>
                  {log.progress_increment ? (
                    <span className="text-emerald-600 font-bold">+{log.progress_increment}%</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomActionBar
        actions={[
          ...(canManage ? [
            { label: 'Tambah Pekerjaan', icon: <Plus className="w-4 h-4" />, onClick: () => setAddOpen(true) },
            { label: 'Lapor Progress', icon: <Save className="w-4 h-4" />, onClick: () => setLogOpen(true), variant: 'primary' as const },
          ] : []),
        ]}
      />

      {addOpen && (
        <GanttAddWorkItemModal
          project={project}
          orgId={tenant?.id}
          existingTasks={ganttTasks}
          members={members}
          onExtendProjectEndDate={canManage ? handleExtendProjectEndDate : undefined}
          onClose={() => setAddOpen(false)}
          onSubmit={handleAddWorkItem}
        />
      )}
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  tone: 'emerald' | 'blue' | 'rose' | 'slate';
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[tone]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
