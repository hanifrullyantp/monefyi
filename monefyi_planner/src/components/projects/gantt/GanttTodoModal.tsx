import { useCallback, useEffect, useState } from 'react';
import { X, Plus, Loader2, Square, SquareCheck, User, Tag } from 'lucide-react';
import type { GanttTask } from '../../../lib/gantt/types';
import type { OrgMember } from '../../../types/onboarding';
import type { PlannerTodo } from '../../../types/plannerTodo';
import { listMembers } from '../../../services/memberService';
import {
  loadTodosForWorkItem, createTodo, updateTodo, toggleTodoDone, deleteTodo,
} from '../../../services/todoService';
import { showToast } from '../../../store/uiStore';

type Props = {
  task: GanttTask;
  orgId: string;
  userId?: string;
  onClose: () => void;
};

export default function GanttTodoModal({ task, orgId, userId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todos, setTodos] = useState<PlannerTodo[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newTags, setNewTags] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [items, mems] = await Promise.all([
        loadTodosForWorkItem(task.id),
        listMembers(orgId),
      ]);
      setTodos(items);
      setMembers(mems);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat todo', 'error');
    } finally {
      setLoading(false);
    }
  }, [task.id, orgId]);

  useEffect(() => { void reload(); }, [reload]);

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const member = members.find(m => m.id === newAssignee);
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      await createTodo({
        org_id: orgId,
        project_id: task.projectId,
        work_item_id: task.id,
        title,
        assigned_member_id: member?.id || null,
        assigned_user_id: member?.user_id || null,
        tags,
        created_by: userId || null,
        sort_order: todos.length,
      });
      setNewTitle('');
      setNewTags('');
      await reload();
      showToast('Todo ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo: PlannerTodo) => {
    try {
      await toggleTodoDone(todo.id, todo.status !== 'done');
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update', 'error');
    }
  };

  const handleAssign = async (todo: PlannerTodo, memberId: string) => {
    const member = members.find(m => m.id === memberId);
    try {
      await updateTodo(todo.id, {
        assigned_member_id: memberId || null,
        assigned_user_id: member?.user_id || null,
      });
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal assign', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal hapus', 'error');
    }
  };

  const pending = todos.filter(t => t.status !== 'done');
  const done = todos.filter(t => t.status === 'done');

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="font-black text-slate-900 truncate">Todo List</h3>
            <p className="text-xs text-slate-500 truncate">{task.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {pending.length === 0 && done.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Belum ada todo. Tambahkan di bawah.</p>
                )}
                {pending.map(todo => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    members={members}
                    onToggle={() => void handleToggle(todo)}
                    onAssign={memberId => void handleAssign(todo, memberId)}
                    onDelete={() => void handleDelete(todo.id)}
                  />
                ))}
                {done.length > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase pt-2">Selesai ({done.length})</p>
                )}
                {done.map(todo => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    members={members}
                    done
                    onToggle={() => void handleToggle(todo)}
                    onAssign={memberId => void handleAssign(todo, memberId)}
                    onDelete={() => void handleDelete(todo.id)}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); }}
                  placeholder="Tambah todo baru..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
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
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    placeholder="Tag (pisah koma)"
                    className="px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={saving || !newTitle.trim()}
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
  todo, members, done = false, onToggle, onAssign, onDelete,
}: {
  todo: PlannerTodo;
  members: OrgMember[];
  done?: boolean;
  onToggle: () => void;
  onAssign: (memberId: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl border ${
      done ? 'bg-emerald-50/60 border-emerald-100 opacity-80' : 'bg-white border-slate-100'
    }`}>
      <button type="button" onClick={onToggle} className="shrink-0 mt-0.5 text-emerald-600">
        {done ? <SquareCheck className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className={`text-sm font-semibold ${done ? 'line-through text-slate-500' : 'text-slate-800'}`}>
          {todo.title}
        </div>
        {todo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {todo.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                <Tag className="w-2.5 h-2.5" />{tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <select
            value={todo.assigned_member_id || ''}
            onChange={e => onAssign(e.target.value)}
            className="text-[10px] border border-slate-200 rounded-md px-1.5 py-0.5 bg-white max-w-full"
          >
            <option value="">Belum di-assign</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.profile?.name || m.role}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="button" onClick={onDelete} className="text-[10px] text-rose-500 hover:underline shrink-0">
        Hapus
      </button>
    </div>
  );
}
