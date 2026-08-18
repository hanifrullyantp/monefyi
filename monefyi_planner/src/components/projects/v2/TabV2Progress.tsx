import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Calendar, Check, CheckCircle2,
  Clock, GanttChart, List, Loader2, Plus, Save, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import {
  createWorkItem,
  updateWorkItem,
  updateProjectProgressFromWorkItems,
  type WorkItem,
} from '../../../services/workItemService';
import { createDailyLog, loadDailyLogs, type DailyLog } from '../../../services/dailyLogService';
import {
  buildSCurveFromWorkItems,
  computeProgressSummary,
  schedulePlanProgress,
  workItemStatusLabel,
} from '../../../lib/progressMetrics';
import { buildUpcomingDeadlines } from '../../../lib/projectCommandUtils';
import { formatDateId, daysUntil } from '../../../utils/projectUi';
import { showToast } from '../../../store/uiStore';
import BottomActionBar from '../../sandbox-ui/BottomActionBar';
import ProjectScheduleGantt from '../command-center/ProjectScheduleGantt';
import GanttAddWorkItemModal from '../gantt/GanttAddWorkItemModal';

type ViewMode = 'list' | 'gantt';

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
  const [view, setView] = useState<ViewMode>('list');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ description: '', progress: '' });
  const [logSaving, setLogSaving] = useState(false);

  const summary = useMemo(() => computeProgressSummary(project, workItems), [project, workItems]);
  const sCurve = useMemo(() => buildSCurveFromWorkItems(project, workItems), [project, workItems]);
  const deadlines = useMemo(() => buildUpcomingDeadlines(project, workItems), [project, workItems]);
  const timelineRows = useMemo(() => {
    if (normalized.project.timeline.length) return normalized.project.timeline;
    return workItems.map((w, i) => ({
      id: i,
      name: w.name,
      weight: Number(w.weight) || 10,
      progress: Number(w.progress_pct) || 0,
      planProgress: schedulePlanProgress(w.planned_start, w.planned_end),
      status: workItemStatusLabel(w) === 'done' ? 'done' : workItemStatusLabel(w) === 'active' ? 'active' : 'pending',
      start: w.planned_start,
      end: w.planned_end,
      workItemId: w.id,
    }));
  }, [normalized.project.timeline, workItems]);

  const reloadLogs = useCallback(async () => {
    try {
      setLogs(await loadDailyLogs(project.id));
    } catch {
      /* non-blocking */
    }
  }, [project.id]);

  useEffect(() => { void reloadLogs(); }, [reloadLogs]);

  const syncProjectProgress = useCallback(async () => {
    const avg = await updateProjectProgressFromWorkItems(project.id);
    if (avg != null) {
      updateProject(project.id, { progress_percentage: avg, planned_progress: summary.plan });
    }
    await onRefresh();
  }, [project.id, summary.plan, updateProject, onRefresh]);

  const handleSaveProgress = async (wiId: string, rawPct: number) => {
    const pct = clampPct(rawPct);
    setSavingId(wiId);
    try {
      await updateWorkItem(wiId, {
        progress_pct: pct,
        status: pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'pending',
      });
      await syncProjectProgress();
      showToast(`Progress diperbarui → ${pct}%`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update progress', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleAddWorkItem = async (data: {
    name: string;
    planned_start: string;
    planned_end: string;
    progress_pct: number;
  }) => {
    try {
      await createWorkItem({
        project_id: project.id,
        name: data.name,
        planned_start: data.planned_start,
        planned_end: data.planned_end,
        progress_pct: data.progress_pct,
        weight: 10,
        status: data.progress_pct > 0 ? 'in_progress' : 'pending',
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

  const handleLogProgress = async () => {
    if (!logForm.description.trim()) {
      showToast('Deskripsi laporan wajib diisi', 'error');
      return;
    }
    setLogSaving(true);
    try {
      await createDailyLog({
        project_id: project.id,
        date: new Date().toISOString().slice(0, 10),
        description: logForm.description.trim(),
        progress_increment: logForm.progress ? Number(logForm.progress) : 0,
        recorded_by: userId,
      });
      setLogForm({ description: '', progress: '' });
      setLogOpen(false);
      await reloadLogs();
      showToast('Laporan progress tercatat', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan laporan', 'error');
    } finally {
      setLogSaving(false);
    }
  };

  const deviationTone = summary.deviation >= 0 ? 'text-emerald-200' : 'text-amber-200';

  return (
    <div className="space-y-5 pb-4">
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
          <h4 className="font-bold text-sm text-slate-800">Laporan Harian</h4>
          <textarea
            value={logForm.description}
            onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Contoh: Finishing kitchen cabinet, 3 tukang hadir"
            rows={2}
            className="w-full px-3 py-2 rounded-xl border text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={logForm.progress}
              onChange={e => setLogForm(f => ({ ...f, progress: e.target.value }))}
              placeholder="Progress +% (opsional)"
              className="w-32 px-3 py-2 rounded-xl border text-sm"
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
              const wi = workItems.find(w => w.id === (item as { workItemId?: string }).workItemId || w.name === item.name);
              const wiId = wi?.id;
              const draftVal = wiId ? (drafts[wiId] ?? String(item.progress)) : String(item.progress);
              const planPct = item.planProgress;
              const behind = item.progress < planPct - 5;

              return (
                <div key={wiId || item.id} className="p-4 hover:bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${
                      item.status === 'done' ? 'bg-emerald-500' : behind ? 'bg-rose-500' : item.status === 'active' ? 'bg-blue-500' : 'bg-slate-200'
                    }`}>
                      {item.status === 'done' ? <Check className="w-4 h-4 text-white" /> : (
                        <span className="text-[10px] font-black text-white">{item.progress}%</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800">{item.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Bobot {item.weight}%
                        </span>
                        {wi && <StatusBadge status={workItemStatusLabel(wi)} />}
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
                    </div>
                    {canManage && wiId && (
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Number(draftVal) || 0}
                          disabled={savingId === wiId}
                          onChange={e => setDrafts(d => ({ ...d, [wiId]: e.target.value }))}
                          className="w-28 accent-emerald-600"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={draftVal}
                          disabled={savingId === wiId}
                          onChange={e => setDrafts(d => ({ ...d, [wiId]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void handleSaveProgress(wiId, Number(draftVal));
                          }}
                          className="w-14 px-2 py-1 border rounded-lg text-center text-sm"
                        />
                        <button
                          type="button"
                          disabled={savingId === wiId}
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
              <Tooltip formatter={(v: number) => [`${v}%`, '']} />
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
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  d.severity === 'overdue' ? 'bg-rose-100 text-rose-700'
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
