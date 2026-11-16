import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Loader2,
  Square,
  SquareCheck,
  User,
  Tag,
  Calendar,
  Pencil,
  Trash2,
  AlertTriangle,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { GanttTask } from '../../../lib/gantt/types';
import type { OrgMember } from '../../../types/onboarding';
import type { PlannerTodo, PlannerTodoPriority } from '../../../types/plannerTodo';
import { listMembers } from '../../../services/memberService';
import {
  loadTodosForWorkItem,
  createTodo,
  updateTodo,
  toggleTodoDone,
  deleteTodo,
} from '../../../services/todoService';
import { isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';
import { useAppStore } from '../../../store/appStore';
import { showToast } from '../../../store/uiStore';

type Props = {
  task: GanttTask;
  orgId: string;
  userId?: string;
  onClose: () => void;
};

const PRIORITY_OPTIONS: { value: PlannerTodoPriority; label: string }[] = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Mendesak' },
];

const TODO_PRIORITY_META: Record<
  PlannerTodoPriority,
  { label: string; badgeClass: string }
> = {
  low: { label: 'Rendah', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Sedang', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'Tinggi', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  urgent: { label: 'Mendesak', badgeClass: 'bg-red-100 text-red-700 border-red-300' },
};

const DEMO_TODO_MEMBERS: OrgMember[] = [
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

const DEMO_TODO_STORAGE_PREFIX = 'monefyi_demo_todos_v1:';

function readDemoTodos(workItemId: string): PlannerTodo[] {
  if (typeof localStorage === 'undefined' || !workItemId) return [];
  try {
    const raw = localStorage.getItem(`${DEMO_TODO_STORAGE_PREFIX}${workItemId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlannerTodo[]) : [];
  } catch {
    return [];
  }
}

function writeDemoTodos(workItemId: string, list: PlannerTodo[]): void {
  if (typeof localStorage === 'undefined' || !workItemId) return;
  try {
    localStorage.setItem(`${DEMO_TODO_STORAGE_PREFIX}${workItemId}`, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function renderDescriptionWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/gi);
  return parts.map((part, idx) => {
    if (/^https?:\/\/[^\s]+$/i.test(part)) {
      return (
        <a
          key={`${idx}-${part.slice(0, 20)}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-emerald-700 underline hover:text-emerald-800 break-all [overflow-wrap:anywhere]"
        >
          <span>{part}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

export default function GanttTodoModal({ task, orgId, userId, onClose }: Props) {
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const isDemoTask = isDemoOrInvalidUuid(task.id, isDemoMode);
  const isDemoOrg = isDemoOrInvalidUuid(orgId, isDemoMode);
  const useDemoStorage = isDemoTask || isDemoOrg;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todos, setTodos] = useState<PlannerTodo[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<PlannerTodoPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [allowDuplicateAdd, setAllowDuplicateAdd] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [items, mems] = await Promise.all([
        useDemoStorage ? Promise.resolve(readDemoTodos(task.id)) : loadTodosForWorkItem(task.id),
        isDemoOrg ? Promise.resolve(DEMO_TODO_MEMBERS) : listMembers(orgId),
      ]);
      setTodos(items);
      setMembers(mems);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat todo', 'error');
    } finally {
      setLoading(false);
    }
  }, [task.id, orgId, useDemoStorage, isDemoOrg]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const duplicateAddTodo = useMemo(() => {
    const normalized = newTitle.trim().toLowerCase();
    if (!normalized) return undefined;
    return todos.find(t => t.title.trim().toLowerCase() === normalized);
  }, [todos, newTitle]);

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    if (duplicateAddTodo && !allowDuplicateAdd) {
      showToast('Judul todo duplikat terdeteksi. Ubah judul atau centang konfirmasi duplikat.', 'error');
      return;
    }

    setSaving(true);
    try {
      const member = members.find(m => m.id === newAssignee);
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const description = newDescription.trim() || null;
      const dueDate = newDueDate || null;

      if (useDemoStorage) {
        const now = new Date().toISOString();
        const created: PlannerTodo = {
          id: `demo-todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          org_id: orgId,
          project_id: task.projectId,
          work_item_id: task.id,
          title,
          description,
          status: 'pending',
          priority: newPriority,
          assigned_member_id: member?.id || null,
          assigned_user_id: member?.user_id || null,
          due_date: dueDate,
          tags,
          sort_order: todos.length,
          created_by: userId || null,
          created_at: now,
          updated_at: now,
          assignee_name: member?.profile?.name,
        };
        const next = [...todos, created];
        writeDemoTodos(task.id, next);
        setTodos(next);
      } else {
        await createTodo({
          org_id: orgId,
          project_id: task.projectId,
          work_item_id: task.id,
          title,
          description,
          priority: newPriority,
          due_date: dueDate,
          assigned_member_id: member?.id || null,
          assigned_user_id: member?.user_id || null,
          tags,
          created_by: userId || null,
          sort_order: todos.length,
        });
        await reload();
      }

      setNewTitle('');
      setNewPriority('medium');
      setNewDueDate('');
      setNewAssignee('');
      setNewTags('');
      setNewDescription('');
      setAllowDuplicateAdd(false);
      showToast('Todo ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo: PlannerTodo) => {
    const nextDone = todo.status !== 'done';
    try {
      if (useDemoStorage || isDemoOrInvalidUuid(todo.id, isDemoMode)) {
        const next = todos.map(t =>
          t.id === todo.id
            ? { ...t, status: nextDone ? ('done' as const) : ('pending' as const), updated_at: new Date().toISOString() }
            : t,
        );
        writeDemoTodos(task.id, next);
        setTodos(next);
        return;
      }
      await toggleTodoDone(todo.id, nextDone);
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update', 'error');
    }
  };

  const handleAssign = async (todo: PlannerTodo, memberId: string) => {
    const member = members.find(m => m.id === memberId);
    try {
      if (useDemoStorage || isDemoOrInvalidUuid(todo.id, isDemoMode)) {
        const next = todos.map(t =>
          t.id === todo.id
            ? {
                ...t,
                assigned_member_id: memberId || null,
                assigned_user_id: member?.user_id || null,
                assignee_name: member?.profile?.name,
                updated_at: new Date().toISOString(),
              }
            : t,
        );
        writeDemoTodos(task.id, next);
        setTodos(next);
        return;
      }
      await updateTodo(todo.id, {
        assigned_member_id: memberId || null,
        assigned_user_id: member?.user_id || null,
      });
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal assign', 'error');
    }
  };

  const handleEditSave = async (
    todoId: string,
    patch: {
      title: string;
      priority: PlannerTodoPriority;
      due_date: string | null;
      description: string | null;
      tags: string[];
    },
  ) => {
    try {
      if (useDemoStorage || isDemoOrInvalidUuid(todoId, isDemoMode)) {
        const next = todos.map(t =>
          t.id === todoId
            ? { ...t, ...patch, updated_at: new Date().toISOString() }
            : t,
        );
        writeDemoTodos(task.id, next);
        setTodos(next);
        showToast('Todo diperbarui', 'success');
        return true;
      }
      await updateTodo(todoId, patch);
      await reload();
      showToast('Todo diperbarui', 'success');
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memperbarui todo', 'error');
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (useDemoStorage || isDemoOrInvalidUuid(id, isDemoMode)) {
        const next = todos.filter(t => t.id !== id);
        writeDemoTodos(task.id, next);
        setTodos(next);
        return;
      }
      await deleteTodo(id);
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal hapus', 'error');
    }
  };

  const pending = todos.filter(t => t.status !== 'done');
  const done = todos.filter(t => t.status === 'done');
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="font-black text-slate-900 truncate">Todo List</h3>
            <p className="text-xs text-slate-500 truncate">{task.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal todo"
            className="p-2 hover:bg-slate-100 rounded-xl shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              <div className="space-y-2 min-w-0">
                {pending.length === 0 && done.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Belum ada todo. Tambahkan di bawah.
                  </p>
                )}
                {pending.length === 0 && done.length > 0 && (
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                    Semua todo aktif pada tugas ini sudah selesai.
                  </p>
                )}
                {pending.length > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Aktif ({pending.length})
                  </p>
                )}
                {pending.map(todo => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    allTodos={todos}
                    members={members}
                    todayIso={todayIso}
                    onToggle={() => void handleToggle(todo)}
                    onAssign={memberId => void handleAssign(todo, memberId)}
                    onEdit={patch => handleEditSave(todo.id, patch)}
                    onDelete={() => void handleDelete(todo.id)}
                  />
                ))}
                {done.length > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase pt-2">
                    Selesai ({done.length})
                  </p>
                )}
                {done.map(todo => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    allTodos={todos}
                    members={members}
                    todayIso={todayIso}
                    done
                    onToggle={() => void handleToggle(todo)}
                    onAssign={memberId => void handleAssign(todo, memberId)}
                    onEdit={patch => handleEditSave(todo.id, patch)}
                    onDelete={() => void handleDelete(todo.id)}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2.5 bg-slate-50 min-w-0">
                <div className="space-y-1.5 min-w-0">
                  <input
                    value={newTitle}
                    onChange={e => {
                      setNewTitle(e.target.value);
                      if (allowDuplicateAdd) setAllowDuplicateAdd(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        void handleAdd();
                      }
                    }}
                    placeholder="Tambah todo baru..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white min-w-0"
                  />
                  {duplicateAddTodo && (
                    <div
                      role="alert"
                      className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 space-y-1.5 min-w-0"
                    >
                      <div className="flex items-start gap-1.5 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="break-words [overflow-wrap:anywhere] min-w-0">
                          Todo dengan judul yang sama sudah ada pada tugas ini
                          {duplicateAddTodo.status === 'done' ? ' (status: selesai)' : ''}.
                        </span>
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-950 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allowDuplicateAdd}
                          onChange={e => setAllowDuplicateAdd(e.target.checked)}
                          className="rounded border-amber-400 accent-amber-600"
                        />
                        <span>Tetap tambahkan todo duplikat</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Prioritas
                    </label>
                    <select
                      aria-label="Prioritas todo"
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value as PlannerTodoPriority)}
                      className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      {PRIORITY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Tenggat
                    </label>
                    <input
                      aria-label="Tenggat todo"
                      type="date"
                      value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Assign ke anggota"
                    value={newAssignee}
                    onChange={e => setNewAssignee(e.target.value)}
                    className="px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Assign ke...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.profile?.name || m.role}</option>
                    ))}
                  </select>
                  <input
                    aria-label="Tag todo"
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    placeholder="Tag (pisah koma)"
                    className="px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Catatan / Link Lampiran (opsional)
                  </label>
                  <textarea
                    aria-label="Catatan atau link lampiran todo"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Catatan detail atau tempel link dokumen (https://...)"
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white resize-y min-w-0"
                  />
                </div>

                <button
                  type="button"
                  disabled={saving || !newTitle.trim() || (Boolean(duplicateAddTodo) && !allowDuplicateAdd)}
                  onClick={() => void handleAdd()}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Tambah Todo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TodoRow({
  todo,
  allTodos,
  members,
  todayIso,
  done = false,
  onToggle,
  onAssign,
  onEdit,
  onDelete,
}: {
  todo: PlannerTodo;
  allTodos: PlannerTodo[];
  members: OrgMember[];
  todayIso: string;
  done?: boolean;
  onToggle: () => void;
  onAssign: (memberId: string) => void;
  onEdit: (patch: {
    title: string;
    priority: PlannerTodoPriority;
    due_date: string | null;
    description: string | null;
    tags: string[];
  }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editPriority, setEditPriority] = useState<PlannerTodoPriority>(todo.priority || 'medium');
  const [editDueDate, setEditDueDate] = useState(todo.due_date || '');
  const [editTags, setEditTags] = useState(todo.tags.join(', '));
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [allowDuplicateEdit, setAllowDuplicateEdit] = useState(false);

  const startEdit = () => {
    setEditTitle(todo.title);
    setEditPriority(todo.priority || 'medium');
    setEditDueDate(todo.due_date || '');
    setEditTags(todo.tags.join(', '));
    setEditDescription(todo.description || '');
    setAllowDuplicateEdit(false);
    setEditing(true);
  };

  const duplicateEditTodo = useMemo(() => {
    const normalized = editTitle.trim().toLowerCase();
    if (!normalized) return undefined;
    return allTodos.find(
      t => t.id !== todo.id && t.title.trim().toLowerCase() === normalized,
    );
  }, [allTodos, todo.id, editTitle]);

  const handleSaveEdit = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    if (duplicateEditTodo && !allowDuplicateEdit) {
      showToast('Judul todo duplikat terdeteksi. Ubah judul atau centang konfirmasi duplikat.', 'error');
      return;
    }
    setSavingEdit(true);
    const ok = await onEdit({
      title: trimmed,
      priority: editPriority,
      due_date: editDueDate || null,
      description: editDescription.trim() || null,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setSavingEdit(false);
    if (ok) setEditing(false);
  };

  const prioMeta = TODO_PRIORITY_META[todo.priority] ?? TODO_PRIORITY_META.medium;
  const dueIso = todo.due_date ? todo.due_date.slice(0, 10) : '';
  const isOverdue = Boolean(!done && dueIso && dueIso < todayIso);

  if (editing) {
    return (
      <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2 min-w-0 max-w-full overflow-hidden">
        <input
          aria-label="Edit judul todo"
          value={editTitle}
          onChange={e => {
            setEditTitle(e.target.value);
            if (allowDuplicateEdit) setAllowDuplicateEdit(false);
          }}
          className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white min-w-0"
          placeholder="Judul todo"
        />
        {duplicateEditTodo && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 space-y-1 min-w-0"
          >
            <div className="flex items-start gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span className="break-words [overflow-wrap:anywhere] min-w-0">
                Judul ini sudah dipakai todo lain di pekerjaan ini.
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicateEdit}
                onChange={e => setAllowDuplicateEdit(e.target.checked)}
                className="rounded border-amber-400 accent-amber-600"
              />
              <span>Tetap simpan judul duplikat</span>
            </label>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Edit prioritas todo"
            value={editPriority}
            onChange={e => setEditPriority(e.target.value as PlannerTodoPriority)}
            className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
          >
            {PRIORITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            aria-label="Edit tenggat todo"
            type="date"
            value={editDueDate}
            onChange={e => setEditDueDate(e.target.value)}
            className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
          />
        </div>
        <input
          aria-label="Edit tag todo"
          value={editTags}
          onChange={e => setEditTags(e.target.value)}
          placeholder="Tag (pisah koma)"
          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white min-w-0"
        />
        <textarea
          aria-label="Edit catatan atau link lampiran todo"
          value={editDescription}
          onChange={e => setEditDescription(e.target.value)}
          placeholder="Catatan / Link Lampiran (https://...)"
          rows={2}
          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white resize-y min-w-0"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={savingEdit}
            onClick={() => setEditing(false)}
            className="px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={savingEdit || !editTitle.trim() || (Boolean(duplicateEditTodo) && !allowDuplicateEdit)}
            onClick={() => void handleSaveEdit()}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Simpan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-xl border min-w-0 max-w-full overflow-hidden ${
        done ? 'bg-emerald-50/60 border-emerald-100 opacity-85' : 'bg-white border-slate-100'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? 'Tandai belum selesai' : 'Tandai selesai'}
        className="shrink-0 mt-0.5 text-emerald-600"
      >
        {done ? <SquareCheck className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div
          className={`text-sm font-semibold break-words [overflow-wrap:anywhere] min-w-0 ${
            done ? 'line-through text-slate-500' : 'text-slate-800'
          }`}
        >
          {todo.title}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span
            className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${prioMeta.badgeClass}`}
          >
            {prioMeta.label}
          </span>
          {dueIso && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                isOverdue
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Calendar className="w-2.5 h-2.5 shrink-0" />
              <span>
                {isOverdue ? 'Terlambat · ' : ''}
                {formatShortDate(dueIso)}
              </span>
            </span>
          )}
        </div>
        {todo.description && (
          <p className="text-xs text-slate-600 break-words [overflow-wrap:anywhere] min-w-0 whitespace-pre-wrap">
            {renderDescriptionWithLinks(todo.description)}
          </p>
        )}
        {todo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 min-w-0">
            {todo.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 max-w-full break-words [overflow-wrap:anywhere]"
              >
                <Tag className="w-2.5 h-2.5 shrink-0" />
                <span className="break-words [overflow-wrap:anywhere]">{tag}</span>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <select
            aria-label={`Assign todo ${todo.title}`}
            value={todo.assigned_member_id || ''}
            onChange={e => onAssign(e.target.value)}
            className="text-[10px] border border-slate-200 rounded-md px-1.5 py-0.5 bg-white max-w-full min-w-0"
          >
            <option value="">Belum di-assign</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.profile?.name || m.role}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-600 hover:text-emerald-700 hover:underline"
        >
          <Pencil className="w-3 h-3" />
          <span>Edit</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-500 hover:underline"
        >
          <Trash2 className="w-3 h-3" />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  );
}
