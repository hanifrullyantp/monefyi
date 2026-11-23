import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, GitBranch, Link2, User, X } from 'lucide-react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { useUiStore } from '../../../store/uiStore';
import type { GanttPriority, GanttTask } from '../../../lib/gantt/types';
import { PRIORITY_LABEL } from '../../../lib/gantt/constants';
import {
  daysBetween,
  getDeadlineOverrunDays,
  isTaskOverProjectDeadline,
} from '../../../lib/gantt/utils';
import { wouldCreateDependencyCycle } from '../../../lib/gantt/criticalPath';
import { listMembers } from '../../../services/memberService';
import type { OrgMember } from '../../../types/onboarding';
import { isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';

export interface GanttAddWorkItemPayload {
  name: string;
  planned_start: string;
  planned_end: string;
  progress_pct: number;
  priority?: GanttPriority;
  assigned_member_id?: string | null;
  dependencies?: string[];
  parent_id?: string | null;
}

interface GanttAddWorkItemModalProps {
  project: Project;
  onClose: () => void;
  onSubmit: (data: GanttAddWorkItemPayload) => Promise<boolean>;
  orgId?: string;
  existingTasks?: GanttTask[];
  parentWorkItemId?: string | null;
  members?: OrgMember[];
  onExtendProjectEndDate?: (newEndDate: string) => Promise<boolean> | void;
}

const PRIORITY_OPTIONS: GanttPriority[] = ['low', 'medium', 'high', 'critical'];
const NEW_TASK_PLACEHOLDER_ID = '__new_work_item__';

function memberDisplayName(m: OrgMember): string {
  return m.profile?.name || m.employee_id || m.position || 'Anggota';
}

/**
 * Quick form to add a work item / subtask with priority, assignee, predecessor, and deadline checks.
 */
export default function GanttAddWorkItemModal({
  project,
  onClose,
  onSubmit,
  orgId,
  existingTasks,
  parentWorkItemId,
  members: membersProp,
  onExtendProjectEndDate,
}: GanttAddWorkItemModalProps) {
  const showToast = useUiStore(s => s.showToast);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const tenantId = useAppStore(s => s.tenant?.id);
  const storeTasks = useGanttStore(s => s.tasks);
  const storeDependencies = useGanttStore(s => s.dependencies);

  const effectiveOrgId = orgId ?? tenantId;

  const candidateTasks = useMemo(() => {
    const source = existingTasks ?? storeTasks;
    return source.filter(t => t.projectId === project.id && t.type !== 'project');
  }, [existingTasks, storeTasks, project.id]);

  const initialParentTask = useMemo(
    () => (parentWorkItemId ? candidateTasks.find(t => t.id === parentWorkItemId) : undefined),
    [parentWorkItemId, candidateTasks],
  );

  const [loading, setLoading] = useState(false);
  const [extendingDeadline, setExtendingDeadline] = useState(false);
  const [loadedMembers, setLoadedMembers] = useState<OrgMember[]>([]);
  const [effectiveProjectEndDate, setEffectiveProjectEndDate] = useState(project.end_date);
  const [form, setForm] = useState({
    name: '',
    planned_start: initialParentTask?.startDate ?? project.start_date,
    planned_end: initialParentTask?.endDate ?? project.end_date,
    progress_pct: 0,
    priority: 'medium' as GanttPriority,
    assigned_member_id: '',
    parent_id: parentWorkItemId ?? '',
    dependencies: [] as string[],
  });

  useEffect(() => {
    setEffectiveProjectEndDate(project.end_date);
  }, [project.end_date]);

  useEffect(() => {
    if (membersProp !== undefined) return;
    if (!effectiveOrgId || isDemoOrInvalidUuid(effectiveOrgId, isDemoMode)) {
      setLoadedMembers([]);
      return;
    }
    let cancelled = false;
    listMembers(effectiveOrgId)
      .then(list => {
        if (!cancelled) setLoadedMembers(list);
      })
      .catch(() => {
        if (!cancelled) setLoadedMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [membersProp, effectiveOrgId, isDemoMode]);

  const effectiveMembers = membersProp ?? loadedMembers;

  const isOverDeadline = isTaskOverProjectDeadline(form.planned_end, effectiveProjectEndDate);
  const overrunDays = getDeadlineOverrunDays(form.planned_end, effectiveProjectEndDate);
  const dayCount =
    form.planned_start && form.planned_end && form.planned_end >= form.planned_start
      ? daysBetween(form.planned_start, form.planned_end)
      : 0;

  const workingGraphDeps = useMemo(
    () => [
      ...storeDependencies,
      ...form.dependencies.map(predId => ({
        fromTaskId: predId,
        toTaskId: NEW_TASK_PLACEHOLDER_ID,
      })),
    ],
    [storeDependencies, form.dependencies],
  );

  const togglePredecessor = (predId: string) => {
    setForm(prev => {
      const exists = prev.dependencies.includes(predId);
      if (exists) {
        return { ...prev, dependencies: prev.dependencies.filter(id => id !== predId) };
      }
      if (wouldCreateDependencyCycle(predId, NEW_TASK_PLACEHOLDER_ID, workingGraphDeps)) {
        showToast('Predecessor ini akan membentuk siklus dependensi', 'error');
        return prev;
      }
      return { ...prev, dependencies: [...prev.dependencies, predId] };
    });
  };

  const handleExtendDeadline = async () => {
    if (!onExtendProjectEndDate || !form.planned_end) return;
    setExtendingDeadline(true);
    try {
      const res = await onExtendProjectEndDate(form.planned_end);
      if (res !== false) {
        setEffectiveProjectEndDate(form.planned_end);
      }
    } finally {
      setExtendingDeadline(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama pekerjaan wajib diisi', 'error');
      return;
    }
    if (!form.planned_start || !form.planned_end) {
      showToast('Tanggal mulai dan tanggal selesai wajib diisi', 'error');
      return;
    }
    if (
      Number.isNaN(new Date(form.planned_start).getTime()) ||
      Number.isNaN(new Date(form.planned_end).getTime())
    ) {
      showToast('Format tanggal tidak valid', 'error');
      return;
    }
    if (new Date(form.planned_end) < new Date(form.planned_start)) {
      showToast('Tanggal selesai harus setelah tanggal mulai', 'error');
      return;
    }

    setLoading(true);
    try {
      const ok = await onSubmit({
        name: form.name.trim(),
        planned_start: form.planned_start,
        planned_end: form.planned_end,
        progress_pct: form.progress_pct,
        priority: form.priority,
        assigned_member_id: form.assigned_member_id || null,
        dependencies: form.dependencies,
        parent_id: form.parent_id || null,
      });
      if (ok) onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900">
              {form.parent_id ? 'Tambah Sub Tugas' : 'Tambah Pekerjaan'}
            </h3>
            <p className="text-xs text-slate-500 truncate">{project.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nama Pekerjaan</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Pekerjaan Struktur Lantai 1"
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mulai</label>
              <input
                type="date"
                value={form.planned_start}
                onChange={e => setForm({ ...form, planned_start: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Selesai</label>
              <input
                type="date"
                value={form.planned_end}
                onChange={e => setForm({ ...form, planned_end: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          {dayCount > 0 && (
            <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
              Durasi rencana: <strong>{dayCount} hari</strong>
            </p>
          )}

          {isOverDeadline && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Melewati Deadline Proyek (+{overrunDays} hari)</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Tanggal selesai ({form.planned_end}) melewati batas akhir proyek ({effectiveProjectEndDate}).
                  </p>
                </div>
              </div>
              {onExtendProjectEndDate && (
                <button
                  type="button"
                  disabled={extendingDeadline}
                  onClick={() => void handleExtendDeadline()}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 disabled:opacity-50"
                >
                  {extendingDeadline
                    ? 'Memperpanjang...'
                    : `Perpanjang deadline proyek ke ${form.planned_end}`}
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Prioritas</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as GanttPriority })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p] || p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <User className="w-3 h-3" /> Penanggung Jawab
              </label>
              <select
                value={form.assigned_member_id}
                onChange={e => setForm({ ...form, assigned_member_id: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="">Belum ditugaskan</option>
                {effectiveMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {memberDisplayName(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(candidateTasks.length > 0 || parentWorkItemId) && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Induk Pekerjaan (Sub Tugas)
              </label>
              <select
                value={form.parent_id}
                onChange={e => setForm({ ...form, parent_id: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="">Langsung di bawah proyek (Root)</option>
                {candidateTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {candidateTasks.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Predecessor / Bergantung Pada (FS)
              </label>
              <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {candidateTasks.map(t => {
                  const checked = form.dependencies.includes(t.id);
                  const wouldCycle =
                    !checked &&
                    wouldCreateDependencyCycle(t.id, NEW_TASK_PLACEHOLDER_ID, workingGraphDeps);

                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${
                        wouldCycle
                          ? 'opacity-50 cursor-not-allowed bg-slate-50'
                          : 'cursor-pointer hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={wouldCycle}
                          onChange={() => togglePredecessor(t.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-700 truncate">{t.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {wouldCycle ? 'Siklus' : t.endDate}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
