import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Wallet, FolderOpen, Search, RefreshCw, TrendingUp,
  AlertTriangle, PieChart, ChevronRight, Loader2, ArrowUpDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';
import { useAppStore } from '../store/appStore';
import { loadAllCosts, aggregateByProject, aggregateCashflow } from '../services/costService';
import type { CostRealization } from '../services/costService';
import { formatRupiah } from '../utils/projectUi';

type PeriodDays = 7 | 30 | 90;
type ProjectSort = 'spent_desc' | 'variance_desc' | 'name';

export default function Finance() {
  const navigate = useNavigate();
  const { tenant, projects, setCommandModalOpen, setActiveTab, user } = useAppStore();
  const [costs, setCosts] = useState<CostRealization[]>([]);
  const [byProject, setByProject] = useState<Array<{ projectId: string; name: string; budget: number; spent: number }>>([]);
  const [cashflow, setCashflow] = useState<{ date: string; amount: number }[]>([]);
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projectSort, setProjectSort] = useState<ProjectSort>('spent_desc');

  const canRecord = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [c, bp, cf] = await Promise.all([
        loadAllCosts(tenant.id),
        aggregateByProject(tenant.id),
        aggregateCashflow(tenant.id, period),
      ]);
      setCosts(c);
      setByProject(bp);
      setCashflow(cf);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, period]);

  useEffect(() => { load(); }, [load]);

  const openProject = (projectId: string) => {
    setActiveTab('projects');
    navigate(`/app/projects/${projectId}`);
  };

  const totalSpent = costs.reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  const totalBudget = byProject.reduce((s, p) => s + p.budget, 0);
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const overBudgetCount = byProject.filter(p => p.budget > 0 && p.spent > p.budget).length;
  const remaining = Math.max(0, totalBudget - totalSpent);

  const projectRows = useMemo(() => {
    let rows = [...byProject];
    if (projectSort === 'spent_desc') rows.sort((a, b) => b.spent - a.spent);
    else if (projectSort === 'variance_desc') rows.sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget));
    else rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [byProject, projectSort]);

  const projectNameMap = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.name])),
    [projects],
  );

  const filteredCosts = useMemo(() => {
    const q = search.toLowerCase();
    return costs.filter(c => {
      const matchSearch = !q
        || c.description.toLowerCase().includes(q)
        || (c.supplier || '').toLowerCase().includes(q)
        || (projectNameMap[c.project_id] || '').toLowerCase().includes(q);
      const matchProject = projectFilter === 'all' || c.project_id === projectFilter;
      return matchSearch && matchProject;
    });
  }, [costs, search, projectFilter, projectNameMap]);

  const supplierBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of costs) {
      const key = c.supplier?.trim() || 'Lainnya';
      map[key] = (map[key] || 0) + Number(c.total_amount);
    }
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [costs]);

  const periodSpent = cashflow.reduce((s, d) => s + d.amount, 0) * 1_000_000;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Keuangan Proyek</h1>
          <p className="text-sm text-slate-500">Realisasi biaya, budget, dan arus kas konsolidasi.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canRecord && (
            <button
              type="button"
              onClick={() => setCommandModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 text-sm"
            >
              <Plus className="w-4 h-4" /> Catat Biaya
            </button>
          )}
        </div>
      </div>

      {loading && costs.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Realisasi', value: formatRupiah(totalSpent), icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Total Budget', value: formatRupiah(totalBudget), icon: PieChart, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Sisa Budget', value: formatRupiah(remaining), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Utilisasi', value: `${utilization.toFixed(0)}%`, icon: BarChartIcon, color: utilization > 90 ? 'text-amber-600' : 'text-indigo-600', bg: utilization > 90 ? 'bg-amber-50' : 'bg-indigo-50' },
              { label: 'Over Budget', value: String(overBudgetCount), icon: AlertTriangle, color: overBudgetCount > 0 ? 'text-rose-600' : 'text-slate-600', bg: overBudgetCount > 0 ? 'bg-rose-50' : 'bg-slate-50' },
            ].map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <div className="text-lg font-black text-slate-900 truncate">{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-slate-800 text-sm">Arus Kas Pengeluaran</h2>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  {([7, 30, 90] as PeriodDays[]).map(d => (
                    <button key={d} type="button" onClick={() => setPeriod(d)} className={`px-3 py-1 rounded-md text-xs font-bold ${period === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                      {d}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {cashflow.every(d => d.amount === 0) ? (
                  <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                    Belum ada pengeluaran {period} hari terakhir
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-3">
                      Total {period} hari: <strong>{formatRupiah(periodSpent)}</strong> · satuan juta Rp di chart
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={cashflow}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit=" jt" />
                        <Tooltip formatter={(v: number) => [`Rp ${v.toFixed(2)} jt`, 'Pengeluaran']} />
                        <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="#6366f125" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b font-bold text-slate-800 text-sm">Top Supplier / Sumber</div>
              {supplierBreakdown.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">Belum ada data supplier</p>
              ) : (
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={supplierBreakdown} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatRupiah(v)} />
                      <Bar dataKey="amount" radius={4}>
                        {supplierBreakdown.map((_, i) => (
                          <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][i] || '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
              <div className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <FolderOpen className="w-4 h-4 text-indigo-600" /> Budget vs Realisasi
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <select value={projectSort} onChange={e => setProjectSort(e.target.value as ProjectSort)} className="text-xs border rounded-lg px-2 py-1.5 bg-white">
                  <option value="spent_desc">Terpakai terbesar</option>
                  <option value="variance_desc">Over budget</option>
                  <option value="name">Nama A–Z</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {projectRows.length === 0 ? (
                <div className="p-10 text-center">
                  <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Belum ada proyek dengan data biaya.</p>
                  {canRecord && (
                    <button type="button" onClick={() => setCommandModalOpen(true)} className="mt-3 text-indigo-600 text-sm font-bold">
                      Catat biaya pertama via Monefyi Button →
                    </button>
                  )}
                </div>
              ) : (
                projectRows.map(p => {
                  const pct = p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : 0;
                  const over = p.budget > 0 && p.spent > p.budget;
                  const variance = p.spent - p.budget;
                  return (
                    <button
                      key={p.projectId}
                      type="button"
                      onClick={() => openProject(p.projectId)}
                      className="w-full p-4 hover:bg-slate-50 text-left transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate group-hover:text-indigo-600">{p.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Budget {formatRupiah(p.budget)}
                            {over && <span className="ml-2 text-rose-600 font-semibold">+{formatRupiah(variance)} over</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <div className={`font-black ${over ? 'text-rose-600' : 'text-slate-900'}`}>{formatRupiah(p.spent)}</div>
                            <div className="text-xs text-slate-400">{pct.toFixed(0)}% terpakai</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b space-y-3">
              <div className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-indigo-600" /> Transaksi ({filteredCosts.length})
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari keterangan, supplier, proyek..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm"
                  />
                </div>
                <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm bg-white min-w-[160px]">
                  <option value="all">Semua proyek</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
              {filteredCosts.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-slate-400">
                    {costs.length === 0
                      ? 'Gunakan Monefyi Button: "catat semen 10 sak 65000 di proyek X"'
                      : 'Tidak ada transaksi cocok dengan filter'}
                  </p>
                </div>
              ) : (
                filteredCosts.slice(0, 50).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openProject(c.project_id)}
                    className="w-full p-4 flex items-center justify-between gap-4 hover:bg-slate-50 text-left group transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate group-hover:text-indigo-600">{c.description}</div>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 mt-0.5">
                        <span>{c.date}</span>
                        {projectNameMap[c.project_id] && (
                          <span className="text-indigo-600">{projectNameMap[c.project_id]}</span>
                        )}
                        {c.supplier && <span>· {c.supplier}</span>}
                        {c.payment_method && <span>· {c.payment_method}</span>}
                      </div>
                    </div>
                    <div className="font-bold text-rose-600 shrink-0">{formatRupiah(Number(c.total_amount))}</div>
                  </button>
                ))
              )}
            </div>
            {filteredCosts.length > 50 && (
              <p className="p-3 text-center text-xs text-slate-400 border-t">Menampilkan 50 dari {filteredCosts.length} transaksi</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M12 20V4M20 20V14" strokeLinecap="round" />
    </svg>
  );
}
