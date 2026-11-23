import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  ListChecks,
  MessageSquare,
  Palette,
  Pencil,
  Plus,
  Route,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import { useAppStore } from '../../../store/appStore';
import { useUiStore } from '../../../store/uiStore';
import {
  daysBetween,
  formatPeriod,
  getDeadlineOverrunDays,
  isTaskOverProjectDeadline,
} from '../../../lib/gantt/utils';
import { computeCriticalPath } from '../../../lib/gantt/criticalPath';
import type { GanttTask, WorkItemAttachment, WorkItemNote } from '../../../lib/gantt/types';
import {
  BAR_COLOR_PRESETS,
  GANTT_COLORS,
  PRIORITY_BADGE_COLOR,
  WORK_ITEM_STATUS_LABEL,
} from '../../../lib/gantt/constants';
import { STATUS_LABEL } from '../../../utils/projectUi';
import {
  updateWorkItemExtendedMeta,
  type WorkItemExtendedMeta,
} from '../../../services/workItemService';
import { listMembers } from '../../../services/memberService';
import type { OrgMember } from '../../../types/onboarding';
import { isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';
import GanttTodoSection from './GanttTodoSection';

type DetailTab = 'detail' | 'subtasks' | 'documents' | 'notes';

export interface GanttDetailPanelProps {
  onEditTask?: (id: string) => void;
  onAddSubTask?: (parentTask: GanttTask) => void;
  onDuplicateTask?: (taskId: string) => Promise<boolean> | void;
  onDeleteTask?: (taskId: string) => Promise<boolean> | void;
  onUpdateMeta?: (taskId: string, patch: WorkItemExtendedMeta) => Promise<boolean> | void;
  members?: OrgMember[];
}

function memberDisplayName(m: OrgMember): string {
  return m.profile?.name || m.employee_id || m.position || 'Anggota';
}

function formatMetaTimestamp(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeSafeUrl(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Reject control characters (including CR/LF/TAB/NULL), whitespace, and backslashes
  if (/[\u0000-\u001F\u007F\s\\]/.test(trimmed)) return null;

  // Allow relative single-slash paths (reject protocol-relative '//...')
  if (trimmed.startsWith('/')) {
    if (!/^\/[^/]/.test(trimmed)) return null;
    try {
      const resolved = new URL(trimmed, 'https://example.invalid');
      if (resolved.origin !== 'https://example.invalid') return null;
      return trimmed;
    } catch {
      return null;
    }
  }

  // Strict protocol allowlist via WHATWG URL parser
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export default function GanttDetailPanel({
  onEditTask,
  onAddSubTask,
  onDuplicateTask,
  onDeleteTask,
  onUpdateMeta,
  members: membersProp,
}: GanttDetailPanelProps) {
  const {
    tasks,
    dependencies,
    selectedIds,
    selectTask,
    detailOpen,
    setDetailOpen,
    setBarColor,
    setTodoModalTaskId,
    setAddWorkItemProjectId,
    updateTaskExtendedMetaLocal,
  } = useGanttStore();
  const tenant = useAppStore(s => s.tenant);
  const user = useAppStore(s => s.user);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const showToast = useUiStore(s => s.showToast);

  const [tab, setTab] = useState<DetailTab>('subtasks');
  const [todoTargetId, setTodoTargetId] = useState<string | null>(null);
  const [loadedMembers, setLoadedMembers] = useState<OrgMember[]>([]);
  const [noteText, setNoteText] = useState('');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [metaBusy, setMetaBusy] = useState(false);

  useEffect(() => {
    if (membersProp !== undefined) return;
    if (!tenant?.id || isDemoOrInvalidUuid(tenant.id, isDemoMode)) {
      setLoadedMembers([]);
      return;
    }
    let cancelled = false;
    listMembers(tenant.id)
      .then(list => {
        if (!cancelled) setLoadedMembers(list);
      })
      .catch(() => {
        if (!cancelled) setLoadedMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [membersProp, tenant?.id, isDemoMode]);

  const effectiveMembers = membersProp ?? loadedMembers;

  const selectedId = [...selectedIds][0];
  const task = tasks.find(t => t.id === selectedId);
  const subTasks = useMemo(
    () => (task ? tasks.filter(t => t.parentId === task.id) : []),
    [tasks, task],
  );

  const cpm = useMemo(() => computeCriticalPath(tasks, dependencies), [tasks, dependencies]);

  const todoTarget = useMemo(() => {
    if (todoTargetId) {
      const t = tasks.find(x => x.id === todoTargetId);
      if (t && t.type === 'work_item') return t;
    }
    if (task?.type === 'work_item') return task;
    return subTasks[0] || null;
  }, [todoTargetId, task, subTasks, tasks]);

  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  if (!detailOpen) {
    return (
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-l-lg px-1 py-4 shadow-sm text-slate-400 hover:text-emerald-600 z-10"
        aria-label="Buka panel detail"
      >
        ‹
      </button>
    );
  }

  if (!task) {
    const firstSelectable = tasks.find(t => t.type === 'work_item') ?? tasks[0];
    return (
      <div className="flex flex-col h-full bg-white border-l border-slate-100 shrink-0 min-w-0 w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-700">Detail Tugas</span>
          <button
            type="button"
            onClick={() => setDetailOpen(false)}
            className="p-1 rounded hover:bg-slate-100"
            aria-label="Tutup panel detail"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <p className="text-xs text-slate-500">
            Pilih pekerjaan di daftar, timeline, atau melalui pemilih cepat di bawah ini.
          </p>
          {tasks.length > 0 && (
            <div className="w-full space-y-2 text-left">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Pilih Tugas Cepat
              </label>
              <select
                value=""
                onChange={e => {
                  if (e.target.value) selectTask(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700"
                aria-label="Pilih tugas cepat"
              >
                <option value="">-- Pilih proyek atau pekerjaan --</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.type === 'project' ? `[Proyek] ${t.name}` : `  ↳ ${t.name}`}
                  </option>
                ))}
              </select>
              {firstSelectable && (
                <button
                  type="button"
                  onClick={() => selectTask(firstSelectable.id)}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                >
                  Buka: {firstSelectable.name}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isProject = task.type === 'project';
  const parentProjectTask = tasks.find(t => t.type === 'project' && t.id === task.projectId);
  const isOverDeadline =
    !isProject && isTaskOverProjectDeadline(task.endDate, parentProjectTask?.endDate);
  const overrunDays = !isProject
    ? getDeadlineOverrunDays(task.endDate, parentProjectTask?.endDate)
    : 0;

  const cpmMetric = !isProject ? cpm.metrics[task.id] : undefined;
  const isCritical = !isProject && (cpmMetric?.isCritical ?? task.isCritical ?? false);
  const totalFloatDays = !isProject ? (cpmMetric?.totalFloatDays ?? task.totalFloatDays) : undefined;

  const predecessors = dependencies
    .filter(d => d.toTaskId === task.id)
    .map(d => taskMap.get(d.fromTaskId))
    .filter((t): t is GanttTask => Boolean(t));
  const successors = dependencies
    .filter(d => d.fromTaskId === task.id)
    .map(d => taskMap.get(d.toTaskId))
    .filter((t): t is GanttTask => Boolean(t));

  const notesList = task.notes ?? [];
  const attachmentsList = task.attachments ?? [];
  const prioMeta = PRIORITY_BADGE_COLOR[task.priority] ?? PRIORITY_BADGE_COLOR.medium;

  const statusLabel = isProject
    ? STATUS_LABEL[task.status as keyof typeof STATUS_LABEL] || task.status
    : WORK_ITEM_STATUS_LABEL[task.status] || task.status;

  const statusColor =
    task.status === 'active' || task.status === 'in_progress'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : task.status === 'completed'
        ? 'bg-slate-100 text-slate-600 border-slate-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  const persistMetaPatch = async (patch: WorkItemExtendedMeta): Promise<boolean> => {
    if (isProject) return false;
    setMetaBusy(true);
    try {
      if (onUpdateMeta) {
        const res = await onUpdateMeta(task.id, patch);
        return res !== false;
      }

      const isDemoTask = isDemoMode || isDemoOrInvalidUuid(task.id, isDemoMode);
      let nextUpdatedAt: string | undefined;
      if (isDemoTask) {
        nextUpdatedAt = new Date().toISOString();
      } else {
        const metaRes = await updateWorkItemExtendedMeta(task.projectId, task.id, patch);
        nextUpdatedAt = metaRes?.updated_at;
      }

      if (patch.notes !== undefined || patch.attachments !== undefined) {
        updateTaskExtendedMetaLocal(task.id, {
          ...(patch.notes !== undefined ? { notes: patch.notes ?? [] } : {}),
          ...(patch.attachments !== undefined ? { attachments: patch.attachments ?? [] } : {}),
          ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
        });
      }

      if (patch.assigned_member_id !== undefined || patch.priority !== undefined) {
        const nextMemberId =
          patch.assigned_member_id !== undefined
            ? patch.assigned_member_id
            : task.assignedMemberId ?? null;
        const memberObj = nextMemberId
          ? effectiveMembers.find(m => m.id === nextMemberId)
          : undefined;
        const nextAssigneeName = memberObj
          ? memberDisplayName(memberObj)
          : nextMemberId
            ? task.assigneeName
            : undefined;
        const patchTask = (t: GanttTask): GanttTask =>
          t.id === task.id
            ? {
                ...t,
                ...(patch.priority !== undefined && patch.priority !== null
                  ? { priority: patch.priority }
                  : {}),
                ...(patch.assigned_member_id !== undefined
                  ? {
                      assignedMemberId: nextMemberId,
                      assigneeId: nextMemberId ?? undefined,
                      assigneeName: nextAssigneeName,
                    }
                  : {}),
                ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
              }
            : t;

        useGanttStore.setState(s => ({
          tasks: s.tasks.map(patchTask),
          baseline: s.baseline
            ? { ...s.baseline, tasks: s.baseline.tasks.map(patchTask) }
            : null,
        }));
      }

      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan pembaruan', 'error');
      return false;
    } finally {
      setMetaBusy(false);
    }
  };

  const handleAddNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed) {
      showToast('Tulis catatan terlebih dahulu', 'error');
      return;
    }
    const newNote: WorkItemNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      authorName: user?.name || user?.email || 'Pengguna',
      createdAt: new Date().toISOString(),
    };
    const nextNotes = [...notesList, newNote];
    const ok = await persistMetaPatch({ notes: nextNotes });
    if (ok) {
      setNoteText('');
      showToast('Catatan ditambahkan', 'success');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const nextNotes = notesList.filter(n => n.id !== noteId);
    const ok = await persistMetaPatch({ notes: nextNotes });
    if (ok) {
      showToast('Catatan dihapus', 'info');
    }
  };

  const handleAddAttachment = async () => {
    const cleanName = docName.trim();
    const safeUrl = normalizeSafeUrl(docUrl);
    if (!cleanName) {
      showToast('Nama lampiran wajib diisi', 'error');
      return;
    }
    if (!safeUrl) {
      showToast('URL lampiran tidak valid', 'error');
      return;
    }
    const newAttachment: WorkItemAttachment = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      url: safeUrl,
      addedAt: new Date().toISOString(),
    };
    const nextAttachments = [...attachmentsList, newAttachment];
    const ok = await persistMetaPatch({ attachments: nextAttachments });
    if (ok) {
      setDocName('');
      setDocUrl('');
      showToast('Lampiran ditambahkan', 'success');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const nextAttachments = attachmentsList.filter(a => a.id !== attachmentId);
    const ok = await persistMetaPatch({ attachments: nextAttachments });
    if (ok) {
      showToast('Lampiran dihapus', 'info');
    }
  };

  const handleTriggerAddSubTask = () => {
    if (onAddSubTask) {
      onAddSubTask(task);
      return;
    }
    setAddWorkItemProjectId(task.projectId);
  };

  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: 'detail', label: 'Detail' },
    { id: 'subtasks', label: 'Sub Tugas', count: subTasks.length },
    { id: 'documents', label: 'Dokumen', count: attachmentsList.length },
    { id: 'notes', label: 'Catatan', count: notesList.length },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100 shrink-0 min-w-0 w-full max-w-full">
      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100 gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 truncate">{task.name}</h3>
          {task.code && <p className="text-[10px] text-slate-400 font-mono">{task.code}</p>}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onEditTask && (
            <button
              type="button"
              onClick={() => onEditTask(task.id)}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
              title="Edit pekerjaan"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {!isProject && (
            <button
              type="button"
              onClick={() => setTodoModalTaskId(task.id)}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
              title="Todo list penuh"
            >
              <ListChecks className="w-3.5 h-3.5" />
            </button>
          )}
          {!isProject && onDuplicateTask && (
            <button
              type="button"
              onClick={() => void onDuplicateTask(task.id)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Duplikasi pekerjaan"
              aria-label="Duplikasi pekerjaan"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {!isProject && onDeleteTask && (
            <button
              type="button"
              onClick={() => {
                if (
                  typeof window === 'undefined' ||
                  window.confirm(`Hapus pekerjaan "${task.name}"?`)
                ) {
                  void onDeleteTask(task.id);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
              title="Hapus pekerjaan"
              aria-label="Hapus pekerjaan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDetailOpen(false)}
            className="p-1 rounded hover:bg-slate-100"
            aria-label="Tutup panel detail"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 border-b border-slate-100">
        {isOverDeadline && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Melewati deadline proyek ({parentProjectTask?.endDate}) +{overrunDays} hari
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-slate-400 font-medium mb-1">Status</div>
            <span
              className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium mb-1">Prioritas</div>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${prioMeta.badgeClass}`}
            >
              {prioMeta.label}
              {(task.priority === 'high' || task.priority === 'critical') && ' ↑'}
            </span>
          </div>
        </div>

        {!isProject && totalFloatDays !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Route className="w-3 h-3" /> Jalur Kritis (CPM)
            </span>
            {isCritical ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                Jalur Kritis (Float: 0 hari)
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Float +{totalFloatDays} hari
              </span>
            )}
          </div>
        )}

        <div>
          <div className="text-[10px] text-slate-400 font-medium mb-1">Progres</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${task.progress}%`, backgroundColor: GANTT_COLORS.selected }}
              />
            </div>
            <span className="text-xs font-black text-slate-700">{Math.round(task.progress)}%</span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-medium mb-1">Periode</div>
          <div className="text-xs text-slate-700">{formatPeriod(task.startDate, task.endDate)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {daysBetween(task.startDate, task.endDate)} hari
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
            <Palette className="w-3 h-3" /> Warna Bar
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {BAR_COLOR_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => {
                  setBarColor(task.id, p.color || null);
                }}
                className={`w-6 h-6 rounded-md border ${
                  (task.barColor || '') === p.color
                    ? 'border-slate-800 ring-1 ring-slate-400'
                    : 'border-slate-200'
                }`}
                style={{ backgroundColor: p.color || '#E2E8F0' }}
              />
            ))}
          </div>
        </div>

        {!isProject ? (
          <div>
            <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Penanggung Jawab
            </div>
            {effectiveMembers.length > 0 ? (
              <select
                value={task.assignedMemberId ?? task.assigneeId ?? ''}
                disabled={metaBusy}
                onChange={e => {
                  const nextId = e.target.value || null;
                  void persistMetaPatch({ assigned_member_id: nextId });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 disabled:opacity-60"
                aria-label="Penanggung Jawab"
              >
                <option value="">Belum ditugaskan</option>
                {effectiveMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {memberDisplayName(m)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {task.assigneeName || 'Belum ditugaskan'}
                </span>
              </div>
            )}
          </div>
        ) : (
          task.assigneeName && (
            <div>
              <div className="text-[10px] text-slate-400 font-medium mb-1">Penanggung Jawab</div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{task.assigneeName}</span>
              </div>
            </div>
          )
        )}
      </div>

      <div className="flex border-b border-slate-100 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[10px] font-bold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}
            {t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 gantt-scroll min-h-0">
        {tab === 'subtasks' && (
          <div className="space-y-2">
            {subTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada sub tugas</p>
            ) : (
              subTasks.map(st => {
                const stLabel = WORK_ITEM_STATUS_LABEL[st.status] || st.status;
                const stBadge =
                  st.status === 'completed'
                    ? 'bg-slate-100 text-slate-600'
                    : st.status === 'in_progress'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-500';
                const isTodoTarget = todoTarget?.id === st.id;

                return (
                  <div key={st.id} className="rounded-xl border border-slate-100 overflow-hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setTodoTargetId(st.id)}
                      onDoubleClick={() => onEditTask?.(st.id)}
                      className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer ${
                        isTodoTarget
                          ? 'bg-emerald-50/60 border-b border-emerald-100'
                          : 'hover:bg-slate-50'
                      }`}
                      title="Klik pilih · Double-click edit"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {st.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {Math.round(st.progress)}%
                          {st.assigneeName ? ` · ${st.assigneeName}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {onEditTask && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onEditTask(st.id);
                            }}
                            className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                            title="Edit sub tugas"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${stBadge}`}>
                          {stLabel}
                          {st.status === 'completed' ? ' ✓' : ''}
                        </span>
                      </div>
                    </div>
                    {isTodoTarget && tenant?.id && (
                      <div className="px-2.5 pb-2.5">
                        <GanttTodoSection
                          workItemId={st.id}
                          workItemName={st.name}
                          projectId={st.projectId}
                          orgId={tenant.id}
                          userId={user?.id}
                          onOpenFull={() => setTodoModalTaskId(st.id)}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <button
              type="button"
              onClick={handleTriggerAddSubTask}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Sub Tugas
            </button>

            {subTasks.length === 0 && !isProject && tenant?.id && (
              <GanttTodoSection
                workItemId={task.id}
                workItemName={task.name}
                projectId={task.projectId}
                orgId={tenant.id}
                userId={user?.id}
                onOpenFull={() => setTodoModalTaskId(task.id)}
              />
            )}
          </div>
        )}

        {tab === 'detail' && (
          <div className="space-y-3 text-xs text-slate-600">
            {task.clientName && (
              <p>
                <span className="font-bold text-slate-800">Klien:</span> {task.clientName}
              </p>
            )}
            <p>
              <span className="font-bold text-slate-800">Tipe:</span>{' '}
              {isProject ? 'Proyek' : 'Pekerjaan / Sub Tugas'}
            </p>
            {task.healthStatus && (
              <p>
                <span className="font-bold text-slate-800">Kesehatan:</span>{' '}
                {task.healthStatus.replace('_', ' ')}
              </p>
            )}

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1">
                  <Link2 className="w-3 h-3" /> Predecessor ({predecessors.length})
                </div>
                {predecessors.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Tidak ada ketergantungan awal</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {predecessors.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectTask(p.id)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-[11px] font-semibold text-slate-700 truncate max-w-full"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1">
                  <Link2 className="w-3 h-3" /> Successor ({successors.length})
                </div>
                {successors.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Tidak ada pekerjaan penerus</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {successors.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectTask(s.id)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-[11px] font-semibold text-slate-700 truncate max-w-full"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!isProject && tenant?.id && (
              <GanttTodoSection
                workItemId={task.id}
                workItemName={task.name}
                projectId={task.projectId}
                orgId={tenant.id}
                userId={user?.id}
                onOpenFull={() => setTodoModalTaskId(task.id)}
              />
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            {isProject ? (
              <div className="text-center py-6 space-y-2">
                <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  Pilih salah satu pekerjaan / sub tugas untuk menambah catatan.
                </p>
                {subTasks[0] && (
                  <button
                    type="button"
                    onClick={() => selectTask(subTasks[0].id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
                  >
                    Buka: {subTasks[0].name}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={2}
                    placeholder="Tulis catatan progres atau kendala..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    disabled={metaBusy}
                    onClick={() => void handleAddNote()}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {metaBusy ? 'Menyimpan...' : 'Tambah Catatan'}
                  </button>
                </div>

                {notesList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Belum ada catatan</p>
                ) : (
                  <div className="space-y-2">
                    {[...notesList].reverse().map(note => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-700">
                              {note.authorName || 'Tim'}
                            </span>
                            {note.createdAt && (
                              <span className="text-[10px] text-slate-400 ml-1.5">
                                {formatMetaTimestamp(note.createdAt)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={metaBusy}
                            onClick={() => void handleDeleteNote(note.id)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 shrink-0"
                            title="Hapus catatan"
                            aria-label="Hapus catatan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {note.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-3">
            {isProject ? (
              <div className="text-center py-6 space-y-2">
                <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  Pilih salah satu pekerjaan / sub tugas untuk melampirkan dokumen atau tautan.
                </p>
                {subTasks[0] && (
                  <button
                    type="button"
                    onClick={() => selectTask(subTasks[0].id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
                  >
                    Buka: {subTasks[0].name}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2 rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                  <input
                    value={docName}
                    onChange={e => setDocName(e.target.value)}
                    placeholder="Nama dokumen / foto lapangan"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                  <input
                    value={docUrl}
                    onChange={e => setDocUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                  <button
                    type="button"
                    disabled={metaBusy}
                    onClick={() => void handleAddAttachment()}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {metaBusy ? 'Menyimpan...' : 'Tambah Lampiran'}
                  </button>
                </div>

                {attachmentsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Belum ada lampiran</p>
                ) : (
                  <div className="space-y-2">
                    {[...attachmentsList].reverse().map(att => {
                      const safeHref = normalizeSafeUrl(att.url);
                      return (
                        <div
                          key={att.id}
                          className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-white p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            {safeHref ? (
                              <a
                                href={safeHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline break-words [overflow-wrap:anywhere]"
                              >
                                <span className="break-words [overflow-wrap:anywhere]">
                                  {att.name}
                                </span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <span
                                title="URL tidak valid"
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 break-words [overflow-wrap:anywhere]"
                              >
                                <span className="break-words [overflow-wrap:anywhere]">
                                  {att.name}
                                </span>
                              </span>
                            )}
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{att.url}</p>
                            {att.addedAt && (
                              <p className="text-[10px] text-slate-400">
                                {formatMetaTimestamp(att.addedAt)}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={metaBusy}
                            onClick={() => void handleDeleteAttachment(att.id)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 shrink-0"
                            title="Hapus lampiran"
                            aria-label="Hapus lampiran"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
