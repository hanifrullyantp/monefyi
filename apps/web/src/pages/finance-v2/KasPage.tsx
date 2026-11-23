import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, ArrowRightLeft, RefreshCw, Lock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import { updateAccount } from '../../services/financeV2/accountService';
import {
  createKasAccount,
  getOrCreateProjectKasAccount,
  loadKasAccounts,
} from '../../services/financeV2/kasService';
import KasTransferModal from '../../components/finance-v2/KasTransferModal';
import ProjectCloseFinanceWizard from '../../components/finance-v2/ProjectCloseFinanceWizard';
import type { FinanceAccount } from '../../types/financeV2';

export default function KasPage() {
  const { tenant, user, projects } = useAppStore();
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeWizardProjectId, setCloseWizardProjectId] = useState<string | null>(null);

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.name])),
    [projects],
  );

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await loadKasAccounts(tenant.id);
      setAccounts(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat kas', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const totalKas = accounts.reduce((s, a) => s + a.current_balance, 0);

  const handleAdd = async () => {
    if (!tenant?.id || !newName.trim()) return;
    try {
      await createKasAccount({
        orgId: tenant.id,
        name: newName.trim(),
        projectId: newProjectId || undefined,
      });
      showToast('Akun kas ditambahkan', 'success');
      setNewName('');
      setNewProjectId('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah akun', 'error');
    }
  };

  const handleCreateProjectKas = async (projectId: string, projectName: string) => {
    if (!tenant?.id) return;
    try {
      await getOrCreateProjectKasAccount(tenant.id, projectId, projectName);
      showToast(`Akun kas proyek dibuat`, 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat akun proyek', 'error');
    }
  };

  const handleDeactivate = async (acc: FinanceAccount) => {
    if (acc.is_system) {
      showToast('Akun sistem tidak dapat dinonaktifkan', 'error');
      return;
    }
    if (!window.confirm(`Nonaktifkan "${acc.name}"?`)) return;
    try {
      await updateAccount(acc.id, { is_active: false });
      showToast('Akun dinonaktifkan', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menonaktifkan', 'error');
    }
  };

  const handleCloseProject = (projectId: string) => {
    setCloseWizardProjectId(projectId);
  };

  const projectsWithoutKas = projects.filter(
    p => p.finance_status !== 'finance_closed' && !accounts.some(a => a.project_id === p.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Total saldo kas: <span className="font-bold text-emerald-700">{formatFinanceRupiah(totalKas)}</span></p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setTransferOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <ArrowRightLeft className="w-4 h-4" /> Transfer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <h3 className="font-bold text-slate-800">Tambah Akun Kas</h3>
        <div className="grid sm:grid-cols-3 gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama akun" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
            <option value="">Kas bisnis (umum)</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" onClick={handleAdd} className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Akun</th>
                <th className="text-left p-3 hidden sm:table-cell">Proyek</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} className="border-t border-slate-50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{acc.name}</div>
                    {acc.is_system && <span className="text-[10px] text-emerald-600 font-semibold">SISTEM</span>}
                  </td>
                  <td className="p-3 hidden sm:table-cell text-slate-500">
                    {acc.project_id ? projectMap[acc.project_id] || '—' : 'Bisnis'}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatFinanceRupiah(acc.current_balance)}</td>
                  <td className="p-3 text-right">
                    {acc.project_id && (
                      <button
                        type="button"
                        disabled={closingId === acc.project_id}
                        onClick={() => handleCloseProject(acc.project_id!)}
                        className="text-xs font-semibold text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg inline-flex items-center gap-1"
                      >
                        {closingId === acc.project_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                        Tutup
                      </button>
                    )}
                    {!acc.is_system && (
                      <button type="button" onClick={() => handleDeactivate(acc)} className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg ml-1">
                        Nonaktif
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {projectsWithoutKas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <h3 className="font-bold text-amber-900 text-sm">Proyek tanpa akun kas</h3>
          {projectsWithoutKas.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{p.name}</span>
              <button type="button" onClick={() => handleCreateProjectKas(p.id, p.name)} className="text-xs font-bold text-emerald-600 hover:underline">
                Buat akun kas
              </button>
            </div>
          ))}
        </div>
      )}

      <KasTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        orgId={tenant?.id || ''}
        userId={user?.id}
        accounts={accounts}
        onSaved={load}
      />

      {closeWizardProjectId && tenant?.id && (
        <ProjectCloseFinanceWizard
          open
          onClose={() => setCloseWizardProjectId(null)}
          orgId={tenant.id}
          projectId={closeWizardProjectId}
          userId={user?.id}
          onSuccess={load}
        />
      )}
    </div>
  );
}
