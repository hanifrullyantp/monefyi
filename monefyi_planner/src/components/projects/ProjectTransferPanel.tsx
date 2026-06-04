import { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import {
  getProjectCashSummary,
  createProjectTransfer,
  loadProjectTransfers,
  type ProjectCashSummary,
  type ProjectTransfer,
} from '../../services/projectTransferService';
import { formatRupiah } from '../../utils/projectUi';
import { todayStr } from '../../lib/adapters';
import type { Project } from '../../store/appStore';
import { useUndoableAction } from '../../hooks/useUndoableAction';
import { showToast } from '../../store/uiStore';

interface Props {
  projectId: string;
  orgId: string;
  userId: string;
  projects: Project[];
  spentAmount: number;
  canManage: boolean;
  onUpdated?: () => void;
}

export default function ProjectTransferPanel({
  projectId,
  orgId,
  userId,
  projects,
  spentAmount,
  canManage,
  onUpdated,
}: Props) {
  const { notifyUndoable } = useUndoableAction();
  const [summary, setSummary] = useState<ProjectCashSummary | null>(null);
  const [transfers, setTransfers] = useState<ProjectTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'loan' | 'repayment'>('loan');
  const [form, setForm] = useState({
    counterpartyId: '',
    amount: '',
    description: '',
    date: todayStr(),
  });

  const projectNameMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const otherProjects = projects.filter(p => p.id !== projectId);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        getProjectCashSummary(projectId, orgId, undefined, spentAmount),
        loadProjectTransfers(orgId, projectId),
      ]);
      setSummary(s);
      setTransfers(t);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat hutang proyek', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, orgId, spentAmount]);

  useEffect(() => { reload(); }, [reload]);

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!form.counterpartyId) {
      showToast('Pilih proyek', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }

    try {
      const fromId = mode === 'loan' ? form.counterpartyId : projectId;
      const toId = mode === 'loan' ? projectId : form.counterpartyId;

      const { undoActionId } = await createProjectTransfer({
        org_id: orgId,
        from_project_id: fromId,
        to_project_id: toId,
        amount,
        type: mode,
        date: form.date,
        description: form.description.trim() || undefined,
        recorded_by: userId,
        undoContext: canManage ? { actorId: userId } : undefined,
      });

      showToast(mode === 'loan' ? 'Pinjaman tercatat' : 'Pelunasan tercatat', 'success');
      notifyUndoable(mode === 'loan' ? 'Pinjaman antar proyek tercatat' : 'Pelunasan tercatat', undoActionId);
      setForm({ counterpartyId: '', amount: '', description: '', date: todayStr() });
      await reload();
      onUpdated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="text-xs font-bold text-violet-700 uppercase mb-1">Saldo Tersedia (Surplus)</div>
        <div className="text-2xl font-black text-violet-900">{formatRupiah(summary?.surplus ?? 0)}</div>
        <div className="text-xs text-violet-600 mt-2">
          Diterima {formatRupiah(summary?.received ?? 0)} · Terpakai {formatRupiah(summary?.spent ?? 0)}
        </div>
      </div>

      {(summary?.owedToProjects.length || summary?.owedFromProjects.length) ? (
        <div className="grid md:grid-cols-2 gap-3">
          {summary!.owedToProjects.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <div className="text-xs font-bold text-rose-700 mb-2">Hutang ke proyek lain</div>
              {summary!.owedToProjects.map(d => (
                <div key={d.projectId} className="flex justify-between text-sm py-1">
                  <span>{projectNameMap[d.projectId] || d.projectId.slice(0, 8)}</span>
                  <span className="font-bold text-rose-700">{formatRupiah(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {summary!.owedFromProjects.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="text-xs font-bold text-emerald-700 mb-2">Piutang dari proyek lain</div>
              {summary!.owedFromProjects.map(d => (
                <div key={d.projectId} className="flex justify-between text-sm py-1">
                  <span>{projectNameMap[d.projectId] || d.projectId.slice(0, 8)}</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">Belum ada hutang antar proyek aktif.</p>
      )}

      {canManage && otherProjects.length > 0 && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            {(['loan', 'repayment'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setMode(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${mode === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {t === 'loan' ? 'Pinjam dari proyek' : 'Bayar hutang'}
              </button>
            ))}
          </div>
          <select
            value={form.counterpartyId}
            onChange={e => setForm(f => ({ ...f, counterpartyId: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Pilih proyek {mode === 'loan' ? 'sumber pinjaman' : 'kreditur'}</option>
            {otherProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
            <input type="number" placeholder="Nominal" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <input placeholder="Keterangan (opsional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          <button type="button" onClick={handleSubmit} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Simpan
          </button>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 font-bold text-sm">Riwayat Transfer</div>
          {transfers.slice(0, 20).map(t => {
            const isIn = t.to_project_id === projectId;
            const otherId = isIn ? t.from_project_id : t.to_project_id;
            return (
              <div key={t.id} className="px-4 py-3 border-t text-sm flex justify-between gap-2">
                <div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.type === 'loan' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.type === 'loan' ? 'Pinjaman' : 'Pelunasan'}
                  </span>
                  <span className="ml-2 text-slate-600">
                    {isIn ? '← dari' : '→ ke'} {projectNameMap[otherId] || otherId.slice(0, 8)}
                  </span>
                  <div className="text-xs text-slate-400 mt-0.5">{t.date}{t.description ? ` · ${t.description}` : ''}</div>
                </div>
                <div className={`font-bold shrink-0 ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isIn ? '+' : '-'}{formatRupiah(t.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
