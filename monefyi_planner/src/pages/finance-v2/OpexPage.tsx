import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import {
  buildOpexComparison,
  createOpexCategory,
  createOpexRealization,
  loadOpexBudgets,
  loadOpexCategories,
  loadOpexRealizations,
  upsertOpexBudget,
} from '../../services/financeV2/opexService';
import type { OpexComparisonRow } from '../../types/financeV2';

type Tab = 'comparison' | 'budget' | 'realization';

export default function OpexPage() {
  const { tenant, user } = useAppStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<Tab>('comparison');
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<OpexComparisonRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [newCat, setNewCat] = useState('');
  const [budgetCatId, setBudgetCatId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [realCatId, setRealCatId] = useState('');
  const [realAmount, setRealAmount] = useState('');
  const [realDate, setRealDate] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [cats, budgets, reals] = await Promise.all([
        loadOpexCategories(tenant.id),
        loadOpexBudgets(tenant.id, month, year),
        loadOpexRealizations(tenant.id, month, year),
      ]);
      setCategories(cats);
      setComparison(buildOpexComparison(cats, budgets, reals));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat opex', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, month, year]);

  useEffect(() => { load(); }, [load]);

  const totalPlanned = comparison.reduce((s, r) => s + r.planned, 0);
  const totalActual = comparison.reduce((s, r) => s + r.actual, 0);

  const handleAddCategory = async () => {
    if (!tenant?.id || !newCat.trim()) return;
    try {
      await createOpexCategory(tenant.id, newCat.trim());
      showToast('Kategori ditambahkan', 'success');
      setNewCat('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const handleSaveBudget = async () => {
    if (!tenant?.id || !budgetCatId || !budgetAmount) return;
    try {
      await upsertOpexBudget({
        orgId: tenant.id,
        categoryId: budgetCatId,
        month,
        year,
        plannedAmount: parseFloat(budgetAmount),
      });
      showToast('Budget disimpan', 'success');
      setBudgetAmount('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const handleSaveRealization = async () => {
    if (!tenant?.id || !realCatId || !realAmount) return;
    try {
      await createOpexRealization({
        orgId: tenant.id,
        categoryId: realCatId,
        amount: parseFloat(realAmount),
        paidDate: realDate,
        createdBy: user?.id,
      });
      showToast('Realisasi dicatat', 'success');
      setRealAmount('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'comparison', label: 'Perbandingan' },
    { id: 'budget', label: 'Budget' },
    { id: 'realization', label: 'Realisasi' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 items-center">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 rounded-xl border text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'long' })}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24 px-3 py-2 rounded-xl border text-sm" />
        </div>
        <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 self-start">
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border p-4">
          <div className="text-xs text-slate-500">Total Budget</div>
          <div className="font-black text-lg text-emerald-700">{formatFinanceRupiah(totalPlanned)}</div>
        </div>
        <div className="bg-white rounded-2xl border p-4">
          <div className="text-xs text-slate-500">Total Realisasi</div>
          <div className={`font-black text-lg ${totalActual > totalPlanned ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatFinanceRupiah(totalActual)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'bg-emerald-100 text-emerald-700' : 'bg-white border text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border p-4 flex gap-2">
        <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Kategori baru" className="flex-1 px-3 py-2 rounded-xl border text-sm" />
        <button type="button" onClick={handleAddCategory} className="flex items-center gap-1 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Kategori
        </button>
      </div>

      {tab === 'budget' && (
        <div className="bg-white rounded-2xl border p-5 space-y-3">
          <h3 className="font-bold">Set Budget Bulanan</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            <select value={budgetCatId} onChange={e => setBudgetCatId(e.target.value)} className="px-3 py-2 rounded-xl border text-sm">
              <option value="">Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="Planned (Rp)" className="px-3 py-2 rounded-xl border text-sm" />
            <button type="button" onClick={handleSaveBudget} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Simpan</button>
          </div>
        </div>
      )}

      {tab === 'realization' && (
        <div className="bg-white rounded-2xl border p-5 space-y-3">
          <h3 className="font-bold">Catat Realisasi</h3>
          <div className="grid sm:grid-cols-4 gap-2">
            <select value={realCatId} onChange={e => setRealCatId(e.target.value)} className="px-3 py-2 rounded-xl border text-sm">
              <option value="">Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" value={realAmount} onChange={e => setRealAmount(e.target.value)} placeholder="Nominal" className="px-3 py-2 rounded-xl border text-sm" />
            <input type="date" value={realDate} onChange={e => setRealDate(e.target.value)} className="px-3 py-2 rounded-xl border text-sm" />
            <button type="button" onClick={handleSaveRealization} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Catat</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : comparison.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-slate-400 text-sm">Tambah kategori dan budget untuk mulai.</div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left p-3">Kategori</th>
                <th className="text-right p-3">Budget</th>
                <th className="text-right p-3">Realisasi</th>
                <th className="text-right p-3">Selisih</th>
                <th className="text-right p-3 hidden sm:table-cell">%</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(row => (
                <tr key={row.categoryId} className="border-t border-slate-50">
                  <td className="p-3 font-semibold">{row.categoryName}</td>
                  <td className="p-3 text-right">{formatFinanceRupiah(row.planned)}</td>
                  <td className="p-3 text-right">{formatFinanceRupiah(row.actual)}</td>
                  <td className={`p-3 text-right font-bold ${row.variance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatFinanceRupiah(row.variance)}
                  </td>
                  <td className="p-3 text-right hidden sm:table-cell text-slate-500">
                    {row.pctUsed != null ? `${row.pctUsed}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
