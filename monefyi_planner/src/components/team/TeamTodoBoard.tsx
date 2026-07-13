import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Square, SquareCheck, User, Tag, Filter } from 'lucide-react';
import type { OrgMember } from '../../types/onboarding';
import type { PlannerTodo } from '../../types/plannerTodo';
import { loadTodosForOrg, toggleTodoDone } from '../../services/todoService';
import { showToast } from '../../store/uiStore';

type Props = {
  orgId: string;
  members: OrgMember[];
  title?: string;
  filterUserId?: string;
  hideAssigneeFilter?: boolean;
};

export default function TeamTodoBoard({
  orgId, members, title = 'Todo Tim', filterUserId, hideAssigneeFilter = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<PlannerTodo[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(filterUserId || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done'>('active');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const items = await loadTodosForOrg(orgId);
      setTodos(items);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat todo tim', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void reload(); }, [reload]);

  const filtered = useMemo(() => {
    let list = [...todos];
    if (assigneeFilter !== 'all') {
      list = list.filter(t => t.assigned_member_id === assigneeFilter || t.assigned_user_id === assigneeFilter);
    }
    if (statusFilter === 'active') list = list.filter(t => t.status !== 'done');
    else if (statusFilter === 'done') list = list.filter(t => t.status === 'done');
    return list;
  }, [todos, assigneeFilter, statusFilter]);

  const handleToggle = async (todo: PlannerTodo) => {
    try {
      await toggleTodoDone(todo.id, todo.status !== 'done');
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update', 'error');
    }
  };

  const memberName = (id?: string | null) => {
    if (!id) return '—';
    const m = members.find(x => x.id === id || x.user_id === id);
    return m?.profile?.name || 'Karyawan';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <SquareCheck className="w-4 h-4 text-emerald-500" />
          {title}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {filtered.length}
          </span>
        </h3>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
          >
            <option value="active">Aktif</option>
            <option value="done">Selesai</option>
            <option value="all">Semua</option>
          </select>
        </div>
        {!hideAssigneeFilter && (
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white max-w-[160px]"
          >
            <option value="all">Semua anggota</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.profile?.name || m.role}</option>
            ))}
          </select>
        )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          Belum ada todo. Double-click sub tugas di Gantt Chart untuk membuat checklist.
        </p>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {filtered.map(todo => {
            const isDone = todo.status === 'done';
            return (
              <div
                key={todo.id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  isDone ? 'bg-emerald-50/50 border-emerald-100' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void handleToggle(todo)}
                  className="shrink-0 mt-0.5"
                >
                  {isDone
                    ? <SquareCheck className="w-5 h-5 text-emerald-600" />
                    : <Square className="w-5 h-5 text-slate-400 hover:text-emerald-600" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${isDone ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                    {todo.title}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {todo.project_name || 'Proyek'}
                    {todo.work_item_name ? ` · ${todo.work_item_name}` : ''}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                      <User className="w-3 h-3" />
                      {todo.assignee_name || memberName(todo.assigned_member_id) || 'Belum assign'}
                    </span>
                    {todo.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
