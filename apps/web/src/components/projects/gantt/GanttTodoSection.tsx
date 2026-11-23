import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Square, ListChecks } from 'lucide-react';
import type { OrgMember } from '../../../types/onboarding';
import type { PlannerTodo } from '../../../types/plannerTodo';
import { listMembers } from '../../../services/memberService';
import {
  loadTodosForWorkItem, createTodo, updateTodo, toggleTodoDone, deleteTodo,
} from '../../../services/todoService';
import { showToast } from '../../../store/uiStore';

type Props = {
  workItemId: string;
  workItemName: string;
  projectId: string;
  orgId: string;
  userId?: string;
  onOpenFull?: () => void;
};

export default function GanttTodoSection({
  workItemId, workItemName, projectId, orgId, userId, onOpenFull,
}: Props) {
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
        loadTodosForWorkItem(workItemId),
        listMembers(orgId),
      ]);
      setTodos(items);
      setMembers(mems);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat todo', 'error');
    } finally {
      setLoading(false);
    }
  }, [workItemId, orgId]);

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
        project_id: projectId,
        work_item_id: workItemId,
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
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pending = todos.filter(t => t.status !== 'done');

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <ListChecks className="w-3.5 h-3.5 text-emerald-600" />
          Todo — {workItemName}
        </div>
        {onOpenFull && (
          <button type="button" onClick={onOpenFull} className="text-[10px] font-bold text-emerald-600 hover:underline">
            Buka penuh
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {pending.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-2">Belum ada todo</p>
            )}
            {pending.map(todo => (
              <div key={todo.id} className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => void toggleTodoDone(todo.id, true).then(reload)}
                  className="shrink-0 text-slate-400 hover:text-emerald-600"
                >
                  <Square className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-slate-800 truncate">{todo.title}</div>
                  {todo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {todo.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-700">{tag}</span>
                      ))}
                    </div>
                  )}
                  <select
                    value={todo.assigned_member_id || ''}
                    onChange={e => {
                      const member = members.find(m => m.id === e.target.value);
                      void updateTodo(todo.id, {
                        assigned_member_id: e.target.value || null,
                        assigned_user_id: member?.user_id || null,
                      }).then(reload);
                    }}
                    className="mt-1 text-[9px] border border-slate-200 rounded px-1 py-0.5 bg-white max-w-full"
                  >
                    <option value="">Assign...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.profile?.name || m.role}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteTodo(todo.id).then(reload)}
                  className="text-[9px] text-rose-500 shrink-0"
                >
                  Hapus
                </button>
              </div>
            ))}
            {todos.filter(t => t.status === 'done').length > 0 && (
              <p className="text-[9px] text-emerald-600 font-bold">
                {todos.filter(t => t.status === 'done').length} selesai
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); }}
              placeholder="Tambah todo..."
              className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-1">
              <select
                value={newAssignee}
                onChange={e => setNewAssignee(e.target.value)}
                className="px-1.5 py-1 text-[10px] border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Assign...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.profile?.name || m.role}</option>
                ))}
              </select>
              <input
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
                placeholder="Tag"
                className="px-1.5 py-1 text-[10px] border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="button"
              disabled={saving || !newTitle.trim()}
              onClick={() => void handleAdd()}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Tambah
            </button>
          </div>
        </>
      )}
    </div>
  );
}
