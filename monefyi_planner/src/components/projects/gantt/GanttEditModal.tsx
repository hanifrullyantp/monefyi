import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  Copy,
  Link2,
  Palette,
  Percent,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { useUiStore } from '../../../store/uiStore';
import type { GanttDependency, GanttPriority, GanttTask } from '../../../lib/gantt/types';
import { STATUS_LABEL } from '../../../utils/projectUi';
import {
  BAR_COLOR_PRESETS,
  PRIORITY_LABEL,
  WORK_ITEM_STATUS_LABEL,
} from '../../../lib/gantt/constants';
import {
  daysBetween,
  getDeadlineOverrunDays,
  isTaskOverProjectDeadline,
} from '../../../lib/gantt/utils';
import {
  cascadeFinishToStartShift,
  wouldCreateDependencyCycle,
} from '../../../lib/gantt/criticalPath';
import { depId } from '../../../services/ganttDependencyService';
import { listMembers } from '../../../services/memberService';
import type { OrgMember } from '../../../types/onboarding';
import { isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';

interface GanttEditModalProps {
  task: GanttTask;
  project?: Project;
  members?: OrgMember[];
  onClose: () => void;
  onSaved: () => void;
  onDuplicateTask?: (taskId: string) => Promise<boolean> | void;
  onDeleteTask?: (taskId: string) => Promise<boolean> | void;
  onExtendProjectEndDate?: (projectId: string, newEndDate: string) => Promise<boolean> | void;
}

const PRIORITY_OPTIONS: GanttPriority[] = ['low', 'medium', 'high', 'critical'];

function memberDisplayName(m: OrgMember): string {
  return m.profile?.name || m.employee_id || m.position || 'Anggota';
}

export default function GanttEditModal({
  task,
  project,
  members: membersProp,
  onClose,
  onSaved,
  onDuplicateTask,
  onDeleteTask,
  onExtendProjectEndDate,
}: GanttEditModalProps) {
  const {
    tasks,
    dependencies,
    pushHistory,
    updateTask,
    updateMultipleTasks,
    setDependencies,
    setBarColor,
  } = useGanttStore();
  const tenantId = useAppStore(s => s.tenant?.id);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const showToast = useUiStore(s => s.showToast);

  const isProject = task.type === 'project';

  const initialPredIds = useMemo(
    () =>
      dependencies
        .filter(d => d.toTaskId === task.id)
        .map(d => d.fromTaskId),
    [dependencies, task.id],
  );

  const projectEndFromStore = useMemo(
    () => tasks.find(t => t.type === 'project' && t.id === task.projectId)?.endDate,
    [tasks, task.projectId],
  );

  const [form, setForm] = useState({
    name: task.name,
    start_date: task.startDate,
    end_date: task.endDate,
    progress: task.progress,
    status: task.status,
    priority: (task.priority || 'medium') as GanttPriority,
    assignedMemberId: task.assignedMemberId ?? task.assigneeId ?? '',
    barColor: task.barColor || '',
    predecessorIds: initialPredIds,
  });

  const [loadedMembers, setLoadedMembers] = useState<OrgMember[]>([]);
  const [effectiveProjectEndDate, setEffectiveProjectEndDate] = useState(
    project?.end_date ?? projectEndFromStore,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    setEffectiveProjectEndDate(project?.end_date ?? projectEndFromStore);
  }, [project?.end_date, projectEndFromStore]);

  useEffect(() => {
    if (isProject || membersProp !== undefined) return;
    if (!tenantId || isDemoOrInvalidUuid(tenantId, isDemoMode)) {
      setLoadedMembers([]);
      return;
    }
    let cancelled = false;
    listMembers(tenantId)
      .then(list => {
        if (!cancelled) setLoadedMembers(list);
      })
      .catch(() => {
        if (!cancelled) setLoadedMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isProject, membersProp, tenantId, isDemoMode]);

  const effectiveMembers = membersProp ?? loadedMembers;

  const candidatePredecessors = useMemo(
    () =>
      isProject
        ? []
        : tasks.filter(
            t => t.projectId === task.projectId && t.type !== 'project' && t.id !== task.id,
          ),
    [isProject, tasks, task.projectId, task.id],
  );

  const depsWithoutIncomingToTask = useMemo(
    () => dependencies.filter(d => d.toTaskId !== task.id),
    [dependencies, task.id],
  );

  const dayCount =
    form.start_date && form.end_date && form.end_date >= form.start_date
      ? daysBetween(form.start_date, form.end_date)
      : 1;

  const isOverDeadline =
    !isProject && isTaskOverProjectDeadline(form.end_date, effectiveProjectEndDate);
  const overrunDays = !isProject
    ? getDeadlineOverrunDays(form.end_date, effectiveProjectEndDate)
    : 0;

  const togglePredecessor = (predId: string) => {
    setForm(prev => {
      const exists = prev.predecessorIds.includes(predId);
      if (exists) {
        return {
          ...prev,
          predecessorIds: prev.predecessorIds.filter(id => id !== predId),
        };
      }
      if (wouldCreateDependencyCycle(predId, task.id, depsWithoutIncomingToTask)) {
        showToast('Dependensi melingkar tidak diizinkan', 'error');
        return prev;
      }
      return {
        ...prev,
        predecessorIds: [...prev.predecessorIds, predId],
      };
    });
  };

  const handleExtendDeadline = async () => {
    if (!onExtendProjectEndDate || !form.end_date) return;
    setActionBusy(true);
    try {
      const res = await onExtendProjectEndDate(task.projectId, form.end_date);
      if (res !== false) {
        setEffectiveProjectEndDate(form.end_date);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleDuplicate = async () => {
    if (!onDuplicateTask) return;
    setActionBusy(true);
    try {
      const res = await onDuplicateTask(task.id);
      if (res !== false) onClose();
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!onDeleteTask) return;
    setActionBusy(true);
    try {
      const res = await onDeleteTask(task.id);
      if (res !== false) onClose();
    } finally {
      setActionBusy(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'error');
      return;
    }
    if (!form.start_date || !form.end_date) {
      showToast('Tanggal mulai dan tanggal selesai wajib diisi', 'error');
      return;
    }
    if (
      Number.isNaN(new Date(form.start_date).getTime()) ||
      Number.isNaN(new Date(form.end_date).getTime())
    ) {
      showToast('Format tanggal tidak valid', 'error');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      showToast('Tanggal selesai harus setelah tanggal mulai', 'error');
      return;
    }

    const trimmedName = form.name.trim();
    const wiStatus = !isProject
      ? form.progress >= 100
        ? 'completed'
        : form.progress > 0
          ? 'in_progress'
          : form.status
      : form.status;
    const nextColor = form.barColor || null;
    const prevColor = task.barColor || null;

    const prevAssigneeId = task.assignedMemberId ?? task.assigneeId ?? '';
    const nextAssigneeId = form.assignedMemberId ? form.assignedMemberId : null;
    const selectedMember = nextAssigneeId
      ? effectiveMembers.find(m => m.id === nextAssigneeId)
      : undefined;
    const nextAssigneeName = selectedMember
      ? memberDisplayName(selectedMember)
      : nextAssigneeId
        ? task.assigneeName
        : undefined;

    const sortedPrevPreds = [...new Set(initialPredIds)].sort();
    const sortedNextPreds = [...new Set(form.predecessorIds)].sort();
    const depsChanged =
      !isProject &&
      JSON.stringify(sortedPrevPreds) !== JSON.stringify(sortedNextPreds);

    const taskChanged =
      trimmedName !== task.name ||
      form.start_date !== task.startDate ||
      form.end_date !== task.endDate ||
      form.progress !== task.progress ||
      wiStatus !== task.status ||
      (!isProject && form.priority !== task.priority) ||
      (!isProject && form.assignedMemberId !== prevAssigneeId);
    const colorChanged = nextColor !== prevColor;

    if (!taskChanged && !colorChanged && !depsChanged) {
      onClose();
      return;
    }

    // Atomic single Undo snapshot covering task fields, FS cascades, dependencies, and barColor
    pushHistory();

    let nextDependencies = dependencies;
    if (depsChanged) {
      const existingByPred = new Map(
        dependencies
          .filter(d => d.toTaskId === task.id)
          .map(d => [d.fromTaskId, d]),
      );
      const addedEdges: GanttDependency[] = sortedNextPreds.map(predId => {
        const prevEdge = existingByPred.get(predId);
        return (
          prevEdge ?? {
            id: depId(predId, task.id),
            fromTaskId: predId,
            toTaskId: task.id,
            type: 'finish_to_start',
          }
        );
      });
      nextDependencies = [...depsWithoutIncomingToTask, ...addedEdges];
      setDependencies(nextDependencies, false);
    }

    const mainPatch: Partial<GanttTask> = {
      name: trimmedName,
      startDate: form.start_date,
      endDate: form.end_date,
      progress: form.progress,
      status: wiStatus,
      ...(!isProject
        ? {
            priority: form.priority,
            assignedMemberId: nextAssigneeId,
            assigneeId: nextAssigneeId ?? undefined,
            assigneeName: nextAssigneeName,
          }
        : {}),
    };

    const endMovedLater = !isProject && form.end_date > task.endDate;
    let cascadedCount = 0;

    if (endMovedLater) {
      const workingTasks = tasks.map(t =>
        t.id === task.id
          ? { ...t, startDate: form.start_date, endDate: form.end_date }
          : t,
      );
      const cascaded = cascadeFinishToStartShift(
        task.id,
        form.end_date,
        workingTasks,
        nextDependencies,
      );
      cascadedCount = cascaded.length;
      if (cascaded.length > 0) {
        updateMultipleTasks(
          [
            { id: task.id, patch: mainPatch },
            ...cascaded.map(u => ({
              id: u.id,
              patch: { startDate: u.startDate, endDate: u.endDate },
            })),
          ],
          false,
        );
      } else if (taskChanged) {
        updateTask(task.id, mainPatch, false);
      }
    } else if (taskChanged) {
      updateTask(task.id, mainPatch, false);
    }

    if (colorChanged) {
      setBarColor(task.id, nextColor, { skipHistory: true });
    }

    showToast(
      cascadedCount > 0
        ? `Perubahan diterapkan (${cascadedCount} penerus digeser) — klik Simpan untuk persist`
        : 'Perubahan diterapkan — klik Simpan untuk persist',
      'info',
    );
    onSaved();
    onClose();
  };

  const statusOptions = isProject
    ? (['planning', 'active', 'on_hold', 'completed'] as const)
    : (['pending', 'in_progress', 'completed'] as const);

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
              Edit {isProject ? 'Proyek' : 'Sub Tugas'}
            </h3>
            {project && isProject && (
              <p className="text-[10px] text-slate-400 font-mono">{project.code}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nama</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Mulai
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Selesai
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
            Durasi: <strong>{dayCount} hari</strong>
          </p>

          {isOverDeadline && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Melewati Deadline Proyek (+{overrunDays} hari)</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Batas akhir proyek saat ini adalah {effectiveProjectEndDate}.
                  </p>
                </div>
              </div>
              {onExtendProjectEndDate && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleExtendDeadline()}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 disabled:opacity-50"
                >
                  Perpanjang deadline proyek ke {form.end_date}
                </button>
              )}
            </div>
          )}

          {!isProject && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Percent className="w-3 h-3" /> Progress
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-black w-10 text-right">{form.progress}%</span>
              </div>
            </div>
          )}

          <div className={`grid gap-3 ${!isProject ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>
                    {isProject
                      ? STATUS_LABEL[s as keyof typeof STATUS_LABEL] || s
                      : WORK_ITEM_STATUS_LABEL[s] || s}
                  </option>
                ))}
              </select>
            </div>

            {!isProject && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Prioritas</label>
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value as GanttPriority })}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p] || p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!isProject && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <User className="w-3 h-3" /> Penanggung Jawab
              </label>
              <select
                value={form.assignedMemberId}
                onChange={e => setForm({ ...form, assignedMemberId: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="">Belum ditugaskan</option>
                {effectiveMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {memberDisplayName(m)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isProject && candidatePredecessors.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Predecessor / Bergantung Pada
              </label>
              <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {candidatePredecessors.map(cand => {
                  const checked = form.predecessorIds.includes(cand.id);
                  const wouldCycle =
                    !checked &&
                    wouldCreateDependencyCycle(cand.id, task.id, depsWithoutIncomingToTask);

                  return (
                    <label
                      key={cand.id}
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
                          onChange={() => togglePredecessor(cand.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-700 truncate">{cand.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {wouldCycle ? 'Siklus' : cand.endDate}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Palette className="w-3 h-3" /> Warna Bar
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {BAR_COLOR_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => setForm({ ...form, barColor: p.color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                    form.barColor === p.color
                      ? 'border-slate-800 ring-2 ring-offset-1 ring-slate-400'
                      : 'border-white shadow-sm'
                  }`}
                  style={{ backgroundColor: p.color || '#E2E8F0' }}
                />
              ))}
            </div>
            <input
              type="color"
              value={form.barColor || '#10B981'}
              onChange={e => setForm({ ...form, barColor: e.target.value })}
              className="mt-2 w-full h-9 rounded-lg cursor-pointer"
            />
          </div>

          {!isProject && confirmDelete && onDeleteTask && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2 text-xs text-rose-800">
              <p className="font-bold">
                Hapus pekerjaan "{task.name}"? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleDeleteConfirmed()}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionBusy ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
          {!isProject && (onDuplicateTask || onDeleteTask) && (
            <div className="flex items-center gap-2">
              {onDuplicateTask && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleDuplicate()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplikasi
                </button>
              )}
              {onDeleteTask && !confirmDelete && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 bg-rose-50 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={actionBusy}
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleSave}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 disabled:opacity-60"
            >
              Terapkan
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
