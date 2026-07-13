import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatRupiah } from '../../utils/projectUi';
import {
  loadOpexBudgets,
  loadOpexCategories,
  upsertOpexBudget,
} from '../../services/financeV2/opexService';
import {
  buildCashForecast,
  loadRevenueForecasts,
  upsertRevenueForecast,
} from '../../services/financeV2/revenueForecastService';
import { buildFinanceReportBundle } from '../../lib/financeV2/reports';

function monthStart(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function FinancePlanningPage() {
  const { tenant, projects } = useAppStore();
  const [period, setPeriod] = useState(monthStart());
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<Awaited<ReturnType<typeof buildCashForecast>> | null>(null);
  const [revenueForecasts, setRevenueForecasts] = useState<Awaited<ReturnType<typeof loadRevenueForecasts>>>([]);
  const [actualNet, setActualNet] = useState(0);
  const [opexPlanned, setOpexPlanned] = useState(0);

  const [projectId, setProjectId] = useState('');
  const [forecastAmount, setForecastAmount] = useState('');
  const [budgetCatId, setBudgetCatId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const month = parseInt(period.slice(5, 7), 10);
  const year = parseInt(period.slice(0, 4), 10);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);
      const [cf, rev, cats, budgets, bundle] = await Promise.all([
        buildCashForecast(tenant.id, period),
        loadRevenueForecasts(tenant.id, period),
        loadOpexCategories(tenant.id),
        loadOpexBudgets(tenant.id, month, year),
        buildFinanceReportBundle({ orgId: tenant.id, dateFrom: period, dateTo: periodEnd }),
      ]);
      setForecast(cf);
      setRevenueForecasts(rev);
      setCategories(cats.map(c => ({ id: c.id, name: c.name })));
      setOpexPlanned(budgets.reduce((s, b) => s + b.planned_amount, 0));
      setActualNet(bundle.profitLoss.netProfit);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat perencanaan', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, period, month, year]);

  useEffect(() => { void load(); }, [load]);

  const revenuePlanned = useMemo(
    () => revenueForecasts.reduce((s, r) => s + r.planned_amount, 0),
    [revenueForecasts],
  );

  const handleSaveForecast = async () => {
    if (!tenant?.id || !forecastAmount) return;
    try {
      await upsertRevenueForecast({
        orgId: tenant.id,
        projectId: projectId || null,
        periodMonth: period,
        plannedAmount: parseFloat(forecastAmount),
      });
      showToast('Forecast pendapatan disimpan', 'success');
      setForecastAmount('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
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
      showToast('Budget opex disimpan', 'success');
      setBudgetAmount('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    }
  };

  if (loading && !forecast) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">Perencanaan Keuangan</h2>
          <p className="text-sm text-slate-500">Budget opex, forecast pendapatan, dan proyeksi kas 3 bulan.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period.slice(0, 7)}
            onChange={e => setPeriod(`${e.target.value}-01`)}
            className="px-3 py-2 rounded-xl border text-sm"
          />
          <button type="button" onClick={load} className="p-2.5 border rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Forecast Pendapatan
          </div>
          <div className="text-2xl font-black text-emerald-700">{formatRupiah(revenuePlanned)}</div>
        </div>
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <PiggyBank className="w-4 h-4 text-rose-600" /> Budget Opex
          </div>
          <div className="text-2xl font-black text-rose-600">{formatRupiah(opexPlanned)}</div>
        </div>
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Wallet className="w-4 h-4 text-violet-600" /> Aktual Laba Bersih
          </div>
          <div className={`text-2xl font-black ${actualNet >= 0 ? 'text-violet-700' : 'text-rose-600'}`}>
            {formatRupiah(actualNet)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Plan vs actual: {formatRupiah(revenuePlanned - opexPlanned)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Tambah Forecast Pendapatan</h3>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm">
            <option value="">Umum / non-proyek</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            type="number"
            placeholder="Nominal rencana"
            value={forecastAmount}
            onChange={e => setForecastAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm"
          />
          <button type="button" onClick={handleSaveForecast} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm">
            Simpan Forecast
          </button>
          <div className="space-y-2 pt-2">
            {revenueForecasts.map(r => (
              <div key={r.id} className="flex justify-between text-sm border-b border-slate-50 py-2">
                <span>{projects.find(p => p.id === r.project_id)?.name || 'Umum'}</span>
                <span className="font-bold text-emerald-700">{formatRupiah(r.planned_amount)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Budget Opex Bulanan</h3>
          <select value={budgetCatId} onChange={e => setBudgetCatId(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm">
            <option value="">Pilih kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            type="number"
            placeholder="Budget bulan ini"
            value={budgetAmount}
            onChange={e => setBudgetAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm"
          />
          <button type="button" onClick={handleSaveBudget} className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm">
            Simpan Budget
          </button>
        </section>
      </div>

      {forecast && (
        <section className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-5 py-4 border-b font-bold text-slate-800">Proyeksi Kas — 3 Bulan</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Bulan</th>
                <th className="text-right p-3">Inflow</th>
                <th className="text-right p-3">Outflow</th>
                <th className="text-right p-3">Net</th>
                <th className="text-right p-3">Kumulatif</th>
              </tr>
            </thead>
            <tbody>
              {forecast.months.map(m => (
                <tr key={m.period} className="border-t border-slate-50">
                  <td className="p-3 font-semibold">{m.period.slice(0, 7)}</td>
                  <td className="p-3 text-right text-emerald-700">{formatRupiah(m.inflow)}</td>
                  <td className="p-3 text-right text-rose-600">{formatRupiah(m.outflow)}</td>
                  <td className={`p-3 text-right font-bold ${m.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatRupiah(m.net)}
                  </td>
                  <td className="p-3 text-right">{formatRupiah(m.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
