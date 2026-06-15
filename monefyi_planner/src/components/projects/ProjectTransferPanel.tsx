import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import {
  getProjectCashSummary,
  createProjectTransfer,
  loadProjectTransfers,
  transferCounterpartyLabel,
  type ProjectCashSummary,
  type ProjectTransfer,
  type TransferSourceType,
} from '../../services/projectTransferService';
import { formatRupiah, parseMoneyInput } from '../../utils/projectUi';
import { todayStr } from '../../lib/adapters';
import type { Project } from '../../store/appStore';
import { useUndoableAction } from '../../hooks/useUndoableAction';
import { showToast } from '../../store/uiStore';

const EXTERNAL_PRESETS = [
  'Owner / Pemilik',
  'Bank',
  'Kantor Pusat',
  'Investor',
  'Supplier (tempo)',
  'Lainnya',
];

interface Props {
  projectId: string;
  orgId: string;
  userId: string;
  projects: Project[];
  spentAmount: number;
  canManage: boolean;
  onUpdated?: () => void | Promise<void>;
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
  const [sourceType, setSourceType] = useState<TransferSourceType>('external');
  const [form, setForm] = useState({
    counterpartyKey: '',
    counterpartyProjectId: '',
    counterpartyName: '',
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

  const owedToOptions = useMemo(() => {
    if (!summary) return [];
    return summary.owedTo.map(d => ({
      key: d.key,
      label: d.sourceType === 'project'
        ? (projectNameMap[d.projectId!] || d.projectId)
        : d.label,
      sourceType: d.sourceType,
      projectId: d.projectId,
      name: d.label,
      amount: d.amount,
    }));
  }, [summary, projectNameMap]);

  const selectRepaymentTarget = (key: string) => {
    const target = owedToOptions.find(o => o.key === key);
    setForm(f => ({
      ...f,
      counterpartyKey: key,
      amount: target ? target.amount.toLocaleString('id-ID') : '',
    }));
  };

  const selectedDebt = owedToOptions.find(o => o.key === form.counterpartyKey);

  const handleSubmit = async () => {
    const amount = parseMoneyInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }

    try {
      if (mode === 'loan') {
        if (sourceType === 'project') {
          if (!form.counterpartyProjectId) {
            showToast('Pilih proyek sumber pinjaman', 'error');
            return;
          }
          const { undoActionId } = await createProjectTransfer({
            org_id: orgId,
            source_type: 'project',
            from_project_id: form.counterpartyProjectId,
            to_project_id: projectId,
            amount,
            type: 'loan',
            date: form.date,
            description: form.description.trim() || undefined,
            recorded_by: userId,
            undoContext: canManage ? { actorId: userId } : undefined,
          });
          showToast('Pinjaman dari proyek tercatat', 'success');
          notifyUndoable('Pinjaman proyek tercatat', undoActionId);
        } else {
          const name = form.counterpartyName.trim();
          if (!name) {
            showToast('Isi sumber pinjaman (bank, owner, dll.)', 'error');
            return;
          }
          const { undoActionId } = await createProjectTransfer({
            org_id: orgId,
            source_type: 'external',
            to_project_id: projectId,
            counterparty_name: name,
            amount,
            type: 'loan',
            date: form.date,
            description: form.description.trim() || undefined,
            recorded_by: userId,
            undoContext: canManage ? { actorId: userId } : undefined,
          });
          showToast('Pinjaman eksternal tercatat', 'success');
          notifyUndoable('Pinjaman eksternal tercatat', undoActionId);
        }
      } else {
        // repayment
        if (form.counterpartyKey) {
          const target = owedToOptions.find(o => o.key === form.counterpartyKey);
          if (!target) {
            showToast('Pilih hutang yang akan dilunasi', 'error');
            return;
          }
          if (amount > target.amount + 0.01) {
            showToast(`Nominal melebihi sisa hutang (${formatRupiah(target.amount)})`, 'error');
            return;
          }
          if (target.sourceType === 'project' && target.projectId) {
            const { undoActionId } = await createProjectTransfer({
              org_id: orgId,
              source_type: 'project',
              from_project_id: projectId,
              to_project_id: target.projectId,
              amount,
              type: 'repayment',
              date: form.date,
              description: form.description.trim() || undefined,
              recorded_by: userId,
              undoContext: canManage ? { actorId: userId } : undefined,
            });
            showToast('Pelunasan ke proyek tercatat', 'success');
            notifyUndoable('Pelunasan hutang tercatat', undoActionId);
          } else {
            const { undoActionId } = await createProjectTransfer({
              org_id: orgId,
              source_type: 'external',
              from_project_id: projectId,
              counterparty_name: target.name,
              amount,
              type: 'repayment',
              date: form.date,
              description: form.description.trim() || undefined,
              recorded_by: userId,
              undoContext: canManage ? { actorId: userId } : undefined,
            });
            showToast('Pelunasan eksternal tercatat', 'success');
            notifyUndoable('Pelunasan hutang tercatat', undoActionId);
          }
        } else if (sourceType === 'external' && form.counterpartyName.trim()) {
          const { undoActionId } = await createProjectTransfer({
            org_id: orgId,
            source_type: 'external',
            from_project_id: projectId,
            counterparty_name: form.counterpartyName.trim(),
            amount,
            type: 'repayment',
            date: form.date,
            description: form.description.trim() || undefined,
            recorded_by: userId,
            undoContext: canManage ? { actorId: userId } : undefined,
          });
          showToast('Pelunasan eksternal tercatat', 'success');
          notifyUndoable('Pelunasan hutang tercatat', undoActionId);
        } else {
          showToast('Pilih hutang atau isi penerima pelunasan', 'error');
          return;
        }
      }

      setForm({
        counterpartyKey: '',
        counterpartyProjectId: '',
        counterpartyName: '',
        amount: '',
        description: '',
        date: todayStr(),
      });
      await reload();
      await onUpdated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const hasDebt = (summary?.owedTo.length || summary?.owedFrom.length) ?? 0;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Saldo Tersedia (Surplus)</div>
        <div className="text-2xl font-black text-emerald-900">{formatRupiah(summary?.surplus ?? 0)}</div>
        <div className="text-xs text-emerald-600 mt-2">
          Diterima {formatRupiah(summary?.received ?? 0)} · Pinjaman masuk {formatRupiah(summary?.loansIn ?? 0)} · Terpakai {formatRupiah(summary?.spent ?? 0)}
        </div>
      </div>

      {hasDebt > 0 ? (
        <div className="grid md:grid-cols-2 gap-3">
          {summary!.owedTo.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <div className="text-xs font-bold text-rose-700 mb-2">Hutang proyek ini</div>
              {summary!.owedTo.map(d => (
                <div key={d.key} className="flex justify-between items-center text-sm py-1 gap-2">
                  <span className="min-w-0 truncate">
                    {d.sourceType === 'external' && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded mr-1">Eksternal</span>
                    )}
                    {d.sourceType === 'project'
                      ? (projectNameMap[d.projectId!] || d.projectId?.slice(0, 8))
                      : d.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-rose-700">{formatRupiah(d.amount)}</span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('repayment');
                          selectRepaymentTarget(d.key);
                        }}
                        className="text-[10px] font-bold text-rose-700 bg-white border border-rose-200 px-2 py-0.5 rounded-lg hover:bg-rose-100"
                      >
                        Bayar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {summary!.owedFrom.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="text-xs font-bold text-emerald-700 mb-2">Piutang ke pihak lain</div>
              {summary!.owedFrom.map(d => (
                <div key={d.key} className="flex justify-between text-sm py-1">
                  <span>{projectNameMap[d.projectId!] || d.projectId?.slice(0, 8)}</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">Belum ada hutang/piutang aktif.</p>
      )}

      {canManage && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['loan', 'repayment'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setMode(t);
                  if (t === 'repayment' && owedToOptions.length === 1) {
                    selectRepaymentTarget(owedToOptions[0].key);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${mode === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {t === 'loan' ? 'Catat Pinjaman Masuk' : 'Bayar Hutang'}
              </button>
            ))}
          </div>

          {mode === 'loan' ? (
            <>
              <div className="flex gap-2 flex-wrap">
                {(['external', 'project'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSourceType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sourceType === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {t === 'external' ? 'Dari luar (bank, owner, dll.)' : 'Dari proyek lain'}
                  </button>
                ))}
              </div>
              {sourceType === 'external' ? (
                <>
                  <input
                    list="lender-presets"
                    placeholder="Sumber pinjaman * (mis. Bank BCA, Owner)"
                    value={form.counterpartyName}
                    onChange={e => setForm(f => ({ ...f, counterpartyName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <datalist id="lender-presets">
                    {EXTERNAL_PRESETS.map(p => <option key={p} value={p} />)}
                  </datalist>
                </>
              ) : otherProjects.length > 0 ? (
                <select
                  value={form.counterpartyProjectId}
                  onChange={e => setForm(f => ({ ...f, counterpartyProjectId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Pilih proyek sumber pinjaman *</option>
                  {otherProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-500">Tidak ada proyek lain di organisasi. Gunakan sumber eksternal.</p>
              )}
            </>
          ) : (
            <>
              {owedToOptions.length > 0 ? (
                <>
                  <select
                    value={form.counterpartyKey}
                    onChange={e => selectRepaymentTarget(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Pilih hutang yang dilunasi *</option>
                    {owedToOptions.map(o => (
                      <option key={o.key} value={o.key}>
                        {o.label} — sisa {formatRupiah(o.amount)}
                      </option>
                    ))}
                  </select>
                  {selectedDebt && (
                    <p className="text-xs text-slate-500">
                      Sisa hutang: <strong>{formatRupiah(selectedDebt.amount)}</strong> — nominal di bawah default lunas penuh, bisa diubah untuk cicilan.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">Belum ada hutang tercatat. Lunasi ke pihak eksternal:</p>
                  <input
                    list="lender-presets-repay"
                    placeholder="Penerima pelunasan * (mis. Bank BCA)"
                    value={form.counterpartyName}
                    onChange={e => setForm(f => ({ ...f, counterpartyName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <datalist id="lender-presets-repay">
                    {EXTERNAL_PRESETS.map(p => <option key={p} value={p} />)}
                  </datalist>
                </>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
            <input
              type="text"
              inputMode="numeric"
              placeholder={mode === 'repayment' && selectedDebt ? `Nominal (max ${formatRupiah(selectedDebt.amount)})` : 'Nominal *'}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <input placeholder="Keterangan (opsional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          <button type="button" onClick={handleSubmit} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Simpan
          </button>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 font-bold text-sm">Riwayat Pinjaman & Pelunasan</div>
          {transfers.slice(0, 30).map(t => {
            const isIn = t.to_project_id === projectId;
            const label = transferCounterpartyLabel(t, projectId, projectNameMap);
            return (
              <div key={t.id} className="px-4 py-3 border-t text-sm flex justify-between gap-2">
                <div className="min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.type === 'loan' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.type === 'loan' ? 'Pinjaman' : 'Pelunasan'}
                  </span>
                  {t.source_type === 'external' && (
                    <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Eksternal</span>
                  )}
                  <span className="ml-2 text-slate-600">
                    {isIn ? '← dari' : '→ ke'} {label}
                  </span>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{t.date}{t.description ? ` · ${t.description}` : ''}</div>
                </div>
                <div className={`font-bold shrink-0 ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isIn ? '+' : '−'}{formatRupiah(t.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
