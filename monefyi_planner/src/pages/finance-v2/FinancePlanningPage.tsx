import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, RefreshCw, TrendingUp, Wallet, PiggyBank, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatRupiah } from '../../utils/projectUi';
import {
  buildOpexComparison,
  loadOpexBudgets,
  loadOpexCategories,
  loadOpexRealizations,
  upsertOpexBudget,
} from '../../services/financeV2/opexService';
import {
  buildCashForecast,
  deleteRevenueForecast,
  loadRevenueForecasts,
  upsertRevenueForecast,
} from '../../services/financeV2/revenueForecastService';
import { buildFinanceReportBundle } from '../../lib/financeV2/reports';
import { getFinanceV2Snapshot } from '../../services/financeV2/balanceSheetService';
import type { OpexComparisonRow } from '../../types/financeV2';

function monthStart(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function periodEnd(month: number, year: number): string {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function varianceClass(variance: number): string {
  if (variance > 0) return 'text-emerald-700';
  if (variance < 0) return 'text-rose-600';
  return 'text-slate-600';
}

export default function FinancePlanningPage() {
  const { tenant, projects } = useAppStore();
  const [period, setPeriod] = useState(monthStart());
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<Awaited<ReturnType<typeof buildCashForecast>> | null>(null);
  const [revenueForecasts, setRevenueForecasts] = useState<Awaited<ReturnType<typeof loadRevenueForecasts>>>([]);
  const [comparison, setComparison] = useState<OpexComparisonRow[]>([]);
  const [actualRevenue, setActualRevenue] = useState(0);
  const [actualNet, setActualNet] = useState(0);
  const [opexPlanned, setOpexPlanned] = useState(0);
  const [opexActual, setOpexActual] = useState(0);
  const [openingKas, setOpeningKas] = useState(0);

  const [projectId, setProjectId] = useState('');
  const [forecastAmount, setForecastAmount] = useState('');
  const [budgetCatId, setBudgetCatId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const month = parseInt(period.slice(5, 7), 10);
  const year = parseInt(period.slice(0, 4), 10);
  const periodEndDate = periodEnd(month, year);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const kasTotal = (await getFinanceV2Snapshot(tenant.id)).accounts
        .filter(a => a.type === 'kas')
        .reduce((s, a) => s + a.current_balance, 0);
      setOpeningKas(kasTotal);

      const [cf, rev, cats, budgets, reals, bundle] = await Promise.all([
        buildCashForecast(tenant.id, period, kasTotal),
        loadRevenueForecasts(tenant.id, period),
        loadOpexCategories(tenant.id),
        loadOpexBudgets(tenant.id, month, year),
        loadOpexRealizations(tenant.id, month, year),
        buildFinanceReportBundle({ orgId: tenant.id, dateFrom: period, dateTo: periodEndDate }),
      ]);
      setForecast(cf);
      setRevenueForecasts(rev);
      setCategories(cats.map(c => ({ id: c.id, name: c.name })));
      setComparison(buildOpexComparison(cats, budgets, reals));
      setOpexPlanned(budgets.reduce((s, b) => s + b.planned_amount, 0));
      setOpexActual(bundle.profitLoss.opex);
      setActualRevenue(bundle.profitLoss.revenue);
      setActualNet(bundle.profitLoss.netProfit);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat perencanaan', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, period, month, year, periodEndDate]);

  useEffect(() => { void load(); }, [load]);

  const revenuePlanned = useMemo(
    () => revenueForecasts.reduce((s, r) => s + r.planned_amount, 0),
    [revenueForecasts],
  );

  const plannedNet = revenuePlanned - opexPlanned;
  const revenueVariance = actualRevenue - revenuePlanned;
  const opexVariance = opexPlanned - opexActual;

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

  const handleDeleteForecast = async (id: string) => {
    try {
      await deleteRevenueForecast(id);
      showToast('Forecast dihapus', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error');
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
          <p className="text-sm text-slate-500">Plan vs actual, budget opex, forecast pendapatan, proyeksi kas.</p>
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          label="Forecast Pendapatan"
          value={revenuePlanned}
          sub={`Aktual ${formatRupiah(actualRevenue)}`}
          subClass={varianceClass(revenueVariance)}
        />
        <KpiCard
          icon={<PiggyBank className="w-4 h-4 text-rose-600" />}
          label="Budget Opex"
          value={opexPlanned}
          sub={`Aktual ${formatRupiah(opexActual)}`}
          subClass={varianceClass(opexVariance)}
        />
        <KpiCard
          icon={<Wallet className="w-4 h-4 text-violet-600" />}
          label="Laba Bersih Aktual"
          value={actualNet}
          sub={`Plan net ${formatRupiah(plannedNet)}`}
          subClass={varianceClass(actualNet - plannedNet)}
        />
        <KpiCard
          icon={<Wallet className="w-4 h-4 text-blue-600" />}
          label="Saldo Kas Awal"
          value={openingKas}
          sub="Basis proyeksi 3 bulan"
        />
      </div>

      <section className="bg-white rounded-2xl border overflow-hidden">
        <div className="px-5 py-4 border-b font-bold text-slate-800">Plan vs Actual — {period.slice(0, 7)}</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Metrik</th>
              <th className="text-right p-3">Rencana</th>
              <th className="text-right p-3">Aktual</th>
              <th className="text-right p-3">Selisih</th>
            </tr>
          </thead>
          <tbody>
            <PlanRow label="Pendapatan" planned={revenuePlanned} actual={actualRevenue} />
            <PlanRow label="Opex" planned={opexPlanned} actual={opexActual} invert />
            <PlanRow label="Laba Bersih (est.)" planned={plannedNet} actual={actualNet} bold />
          </tbody>
        </table>
      </section>

      {comparison.length > 0 && (
        <section className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-5 py-4 border-b font-bold text-slate-800">Opex per Kategori</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Kategori</th>
                <th className="text-right p-3">Budget</th>
                <th className="text-right p-3">Aktual</th>
                <th className="text-right p-3">%</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(row => (
                <tr key={row.categoryId} className="border-t border-slate-50">
                  <td className="p-3 font-medium">{row.categoryName}</td>
                  <td className="p-3 text-right">{formatRupiah(row.planned)}</td>
                  <td className="p-3 text-right text-rose-600">{formatRupiah(row.actual)}</td>
                  <td className="p-3 text-right font-bold">{row.pctUsed != null ? `${row.pctUsed}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Forecast Pendapatan</h3>
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
          <div className="space-y-1 pt-2">
            {revenueForecasts.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b border-slate-50 py-2">
                <span>{projects.find(p => p.id === r.project_id)?.name || 'Umum'}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700">{formatRupiah(r.planned_amount)}</span>
                  <button type="button" onClick={() => handleDeleteForecast(r.id)} className="p-1 text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {!revenueForecasts.length && <p className="text-xs text-slate-500">Belum ada forecast bulan ini.</p>}
          </div>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Tambah Budget Opex</h3>
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
          <div className="px-5 py-4 border-b">
            <div className="font-bold text-slate-800">Proyeksi Kas — 3 Bulan</div>
            <p className="text-xs text-slate-500 mt-0.5">Saldo awal: {formatRupiah(forecast.openingBalance)}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Bulan</th>
                <th className="text-right p-3">Inflow (plan)</th>
                <th className="text-right p-3">Outflow (plan)</th>
                <th className="text-right p-3">Net</th>
                <th className="text-right p-3">Saldo Proyeksi</th>
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
                  <td className="p-3 text-right font-black text-violet-700">{formatRupiah(m.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, subClass,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">{icon}{label}</div>
      <div className="text-xl font-black text-slate-800">{formatRupiah(value)}</div>
      {sub && <p className={`text-xs mt-1 ${subClass || 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

function PlanRow({
  label, planned, actual, invert, bold,
}: {
  label: string;
  planned: number;
  actual: number;
  invert?: boolean;
  bold?: boolean;
}) {
  const variance = invert ? planned - actual : actual - planned;
  return (
    <tr className={`border-t border-slate-50 ${bold ? 'font-black bg-slate-50/50' : ''}`}>
      <td className="p-3">{label}</td>
      <td className="p-3 text-right">{formatRupiah(planned)}</td>
      <td className="p-3 text-right">{formatRupiah(actual)}</td>
      <td className={`p-3 text-right font-bold ${varianceClass(variance)}`}>
        {variance >= 0 ? '+' : ''}{formatRupiah(variance)}
      </td>
    </tr>
  );
}
