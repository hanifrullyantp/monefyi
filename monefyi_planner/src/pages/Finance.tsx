import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Wallet, FolderOpen, Search, RefreshCw, TrendingUp,
  AlertTriangle, PieChart, ChevronRight, Loader2, ArrowUpDown,
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, Line,
} from 'recharts';
import { useAppStore } from '../store/appStore';
import {
  loadUnifiedTransactions,
  aggregateNetCashflow,
  getOrgFinanceTotals,
  type UnifiedTransaction,
} from '../services/projectFinanceService';
import { loadAllTransfers } from '../services/projectTransferService';
import { formatRupiah } from '../utils/projectUi';

type PeriodDays = 7 | 30 | 90;
type ProjectSort = 'spent_desc' | 'variance_desc' | 'name';
type TxFilter = 'all' | 'income' | 'expense';

export default function Finance() {
  const navigate = useNavigate();
  const { tenant, projects, setCommandModalOpen, setActiveTab, user } = useAppStore();
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [byProject, setByProject] = useState<Array<{
    projectId: string;
    name: string;
    budget: number;
    spent: number;
    received: number;
    surplus: number;
    interProjectDebt: number;
  }>>([]);
  const [totals, setTotals] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    netCash: 0,
    totalBudget: 0,
    interProjectDebtOutstanding: 0,
  });
  const [cashflow, setCashflow] = useState<{ date: string; inflow: number; outflow: number; net: number }[]>([]);
  const [transfers, setTransfers] = useState<Awaited<ReturnType<typeof loadAllTransfers>>>([]);
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projectSort, setProjectSort] = useState<ProjectSort>('spent_desc');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

  const canRecord = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'admin';

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [tx, finance, cf, tr] = await Promise.all([
        loadUnifiedTransactions(tenant.id),
        getOrgFinanceTotals(tenant.id),
        aggregateNetCashflow(tenant.id, period),
        loadAllTransfers(tenant.id),
      ]);
      setTransactions(tx);
      setByProject(finance.projects);
      setTotals({
        totalInflow: finance.totalInflow,
        totalOutflow: finance.totalOutflow,
        netCash: finance.netCash,
        totalBudget: finance.totalBudget,
        interProjectDebtOutstanding: finance.interProjectDebtOutstanding,
      });
      setCashflow(cf);
      setTransfers(tr);
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

  const utilization = totals.totalBudget > 0 ? (totals.totalOutflow / totals.totalBudget) * 100 : 0;
  const overBudgetCount = byProject.filter(p => p.budget > 0 && p.spent > p.budget).length;

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

  const filteredTx = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(c => {
      const matchSearch = !q
        || c.description.toLowerCase().includes(q)
        || (projectNameMap[c.project_id] || '').toLowerCase().includes(q);
      const matchProject = projectFilter === 'all' || c.project_id === projectFilter;
      const matchType = txFilter === 'all' || (txFilter === 'income' ? c.kind === 'income' : c.kind === 'expense');
      return matchSearch && matchProject && matchType;
    });
  }, [transactions, search, projectFilter, projectNameMap, txFilter]);

  const supplierBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of transactions.filter(t => t.kind === 'expense')) {
      const key = c.meta?.trim() || 'Lainnya';
      map[key] = (map[key] || 0) + c.amount;
    }
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [transactions]);

  const activeTransfers = transfers.slice(0, 15);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Keuangan Proyek</h1>
          <p className="text-sm text-slate-500">Pemasukan, realisasi biaya, net kas, dan hutang antar proyek.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canRecord && (
            <>
              <button
                type="button"
                onClick={() => setCommandModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg text-sm"
              >
                <Plus className="w-4 h-4" /> Catat Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setCommandModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 text-sm"
              >
                <Plus className="w-4 h-4" /> Catat Biaya
              </button>
            </>
          )}
        </div>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Pemasukan', value: formatRupiah(totals.totalInflow), icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total Realisasi', value: formatRupiah(totals.totalOutflow), icon: ArrowUpRight, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Net Kas', value: formatRupiah(totals.netCash), icon: Wallet, color: totals.netCash >= 0 ? 'text-indigo-600' : 'text-rose-600', bg: totals.netCash >= 0 ? 'bg-indigo-50' : 'bg-rose-50' },
              { label: 'Hutang Antar Proyek', value: formatRupiah(totals.interProjectDebtOutstanding), icon: ArrowRightLeft, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Utilisasi Budget', value: `${utilization.toFixed(0)}%`, icon: PieChart, color: utilization > 90 ? 'text-amber-600' : 'text-violet-600', bg: utilization > 90 ? 'bg-amber-50' : 'bg-violet-50' },
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
                <h2 className="font-bold text-slate-800 text-sm">Pemasukan vs Pengeluaran</h2>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  {([7, 30, 90] as PeriodDays[]).map(d => (
                    <button key={d} type="button" onClick={() => setPeriod(d)} className={`px-3 py-1 rounded-md text-xs font-bold ${period === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                      {d}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {cashflow.every(d => d.inflow === 0 && d.outflow === 0) ? (
                  <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                    Belum ada transaksi {period} hari terakhir
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-3">Satuan juta Rp · transfer antar proyek tidak masuk arus kas org</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={cashflow}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit=" jt" />
                        <Tooltip formatter={(v: number, name: string) => [`Rp ${v.toFixed(2)} jt`, name === 'inflow' ? 'Masuk' : name === 'outflow' ? 'Keluar' : 'Net']} />
                        <Area type="monotone" dataKey="inflow" name="inflow" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                        <Area type="monotone" dataKey="outflow" name="outflow" stroke="#f43f5e" fill="#f43f5e15" strokeWidth={2} />
                        <Line type="monotone" dataKey="net" name="net" stroke="#6366f1" strokeWidth={2} dot={false} />
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
                  <p className="text-sm text-slate-500">Belum ada proyek dengan data keuangan.</p>
                </div>
              ) : (
                projectRows.map(p => {
                  const pct = p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : 0;
                  const over = p.budget > 0 && p.spent > p.budget;
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
                          <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                            <span>Budget {formatRupiah(p.budget)}</span>
                            <span className="text-emerald-600">Diterima {formatRupiah(p.received)}</span>
                            <span className="text-violet-600">Saldo+ {formatRupiah(p.surplus)}</span>
                            {p.interProjectDebt > 0 && (
                              <span className="text-amber-600 font-semibold">Hutang {formatRupiah(p.interProjectDebt)}</span>
                            )}
                            {over && <span className="text-rose-600 font-semibold">Over budget</span>}
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

          {activeTransfers.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b font-bold text-slate-800 text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" /> Pinjaman Antar Proyek
              </div>
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {activeTransfers.map(t => (
                  <div key={t.id} className="p-4 text-sm flex justify-between gap-2">
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.type === 'loan' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {t.type === 'loan' ? 'Pinjaman' : 'Pelunasan'}
                      </span>
                      <span className="ml-2">
                        {projectNameMap[t.from_project_id] || 'Proyek'} → {projectNameMap[t.to_project_id] || 'Proyek'}
                      </span>
                      <div className="text-xs text-slate-400 mt-0.5">{t.date}</div>
                    </div>
                    <div className="font-bold text-slate-800">{formatRupiah(t.amount)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b space-y-3">
              <div className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-indigo-600" /> Transaksi ({filteredTx.length})
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari keterangan, proyek..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm"
                  />
                </div>
                <select value={txFilter} onChange={e => setTxFilter(e.target.value as TxFilter)} className="px-3 py-2.5 rounded-xl border text-sm bg-white">
                  <option value="all">Semua tipe</option>
                  <option value="income">Masuk</option>
                  <option value="expense">Keluar</option>
                </select>
                <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm bg-white min-w-[160px]">
                  <option value="all">Semua proyek</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
              {filteredTx.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-slate-400">Tidak ada transaksi cocok dengan filter</p>
                </div>
              ) : (
                filteredTx.slice(0, 50).map(c => (
                  <button
                    key={`${c.kind}-${c.id}`}
                    type="button"
                    onClick={() => openProject(c.project_id)}
                    className="w-full p-4 flex items-center justify-between gap-4 hover:bg-slate-50 text-left group transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.kind === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {c.kind === 'income' ? 'Masuk' : 'Keluar'}
                        </span>
                        <span className="font-medium text-slate-800 truncate group-hover:text-indigo-600">{c.description}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 mt-0.5">
                        <span>{c.date}</span>
                        {projectNameMap[c.project_id] && (
                          <span className="text-indigo-600">{projectNameMap[c.project_id]}</span>
                        )}
                        {c.meta && <span>· {c.meta}</span>}
                      </div>
                    </div>
                    <div className={`font-bold shrink-0 ${c.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {c.kind === 'income' ? '+' : '−'}{formatRupiah(c.amount)}
                    </div>
                  </button>
                ))
              )}
            </div>
            {filteredTx.length > 50 && (
              <p className="p-3 text-center text-xs text-slate-400 border-t">Menampilkan 50 dari {filteredTx.length} transaksi</p>
            )}
          </section>

          {overBudgetCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {overBudgetCount} proyek melebihi budget RAP
            </div>
          )}
        </>
      )}
    </div>
  );
}
