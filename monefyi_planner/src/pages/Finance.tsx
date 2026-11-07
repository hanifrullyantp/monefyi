import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Wallet, FolderOpen, Search, RefreshCw,
  AlertTriangle, PieChart, ChevronRight, Loader2, ArrowUpDown,
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, BarChart3, LayoutDashboard,
} from 'lucide-react';
import BusinessReportPanel from '../components/finance-v1/BusinessReportPanel';
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
type FinanceView = 'dashboard' | 'laporan';

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
  const [view, setView] = useState<FinanceView>('dashboard');

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
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A]">Keuangan Proyek</h1>
          <p className="text-sm text-[#5B6B7A] mt-0.5">
            {view === 'dashboard'
              ? 'Pemasukan, realisasi biaya, net kas, dan hutang proyek (internal & eksternal).'
              : 'Laporan laba rugi bisnis terintegrasi proyek + biaya operasional.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === 'dashboard' && (
            <>
              <button type="button" onClick={load} className="p-2.5 min-h-11 min-w-11 flex items-center justify-center border border-[#E5EAE8] rounded-xl hover:bg-[#F4F7F5] transition-colors" aria-label="Muat ulang">
                <RefreshCw className={`w-4 h-4 text-[#5B6B7A] ${loading ? 'animate-spin' : ''}`} />
              </button>
              {canRecord && (
                <>
                  <button
                    type="button"
                    onClick={() => setCommandModalOpen(true)}
                    className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-bold px-4 h-11 rounded-xl shadow-sm text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Catat Pemasukan
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommandModalOpen(true)}
                    className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-bold px-4 h-11 rounded-xl shadow-sm text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Catat Biaya
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-[#F4F7F5] border border-[#E5EAE8] p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setView('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            view === 'dashboard' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#5B6B7A] hover:text-[#0F172A]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Ringkasan
        </button>
        <button
          type="button"
          onClick={() => setView('laporan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            view === 'laporan' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#5B6B7A] hover:text-[#0F172A]'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Laporan Bisnis
        </button>
      </div>

      {view === 'laporan' ? (
        <BusinessReportPanel />
      ) : loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Total Pemasukan', value: formatRupiah(totals.totalInflow), icon: ArrowDownLeft, color: 'text-[#059669]', bg: 'bg-emerald-50' },
              { label: 'Total Realisasi', value: formatRupiah(totals.totalOutflow), icon: ArrowUpRight, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Net Kas', value: formatRupiah(totals.netCash), icon: Wallet, color: totals.netCash >= 0 ? 'text-[#059669]' : 'text-rose-600', bg: totals.netCash >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
              { label: 'Total Hutang Proyek', value: formatRupiah(totals.interProjectDebtOutstanding), icon: ArrowRightLeft, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Utilisasi Budget', value: `${utilization.toFixed(0)}%`, icon: PieChart, color: utilization > 90 ? 'text-amber-600' : 'text-[#059669]', bg: utilization > 90 ? 'bg-amber-50' : 'bg-emerald-50' },
            ].map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white rounded-2xl p-4 border border-[#E5EAE8] shadow-sm">
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <div className="text-xl font-black text-[#0F172A] truncate tabular-nums">{k.value}</div>
                <div className="text-xs text-[#5B6B7A] mt-0.5 font-medium">{k.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E5EAE8] flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-[#0F172A] text-sm">Pemasukan vs Pengeluaran</h2>
                <div className="flex gap-1 bg-[#F4F7F5] border border-[#E5EAE8] p-1 rounded-lg">
                  {([7, 30, 90] as PeriodDays[]).map(d => (
                    <button key={d} type="button" onClick={() => setPeriod(d)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${period === d ? 'bg-white text-[#059669] shadow-xs' : 'text-[#5B6B7A]'}`}>
                      {d}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {cashflow.every(d => d.inflow === 0 && d.outflow === 0) ? (
                  <div className="h-48 flex items-center justify-center text-sm text-[#5B6B7A]">
                    Belum ada transaksi {period} hari terakhir
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[#5B6B7A] mb-3">Satuan juta Rp · transfer antar proyek tidak masuk arus kas org</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={cashflow}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F4F7F5" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5B6B7A' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#5B6B7A' }} unit=" jt" />
                        <Tooltip formatter={(v: any, name: any) => [`Rp ${Number(v || 0).toFixed(2)} jt`, name === 'inflow' ? 'Masuk' : name === 'outflow' ? 'Keluar' : 'Net']} />
                        <Area type="monotone" dataKey="inflow" name="inflow" stroke="#059669" fill="#05966920" strokeWidth={2} />
                        <Area type="monotone" dataKey="outflow" name="outflow" stroke="#EF4444" fill="#EF444415" strokeWidth={2} />
                        <Line type="monotone" dataKey="net" name="net" stroke="#059669" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E5EAE8] font-bold text-[#0F172A] text-sm">Top Supplier / Sumber</div>
              {supplierBreakdown.length === 0 ? (
                <p className="p-6 text-sm text-[#5B6B7A] text-center">Belum ada data supplier</p>
              ) : (
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={supplierBreakdown} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fill: '#5B6B7A' }} />
                      <Tooltip formatter={(v: any) => formatRupiah(Number(v || 0))} />
                      <Bar dataKey="amount" radius={4}>
                        {supplierBreakdown.map((_, i) => (
                          <Cell key={i} fill={['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'][i] || '#059669'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5EAE8] flex flex-wrap items-center justify-between gap-3">
              <div className="font-bold text-[#0F172A] flex items-center gap-2 text-sm">
                <FolderOpen className="w-4 h-4 text-[#059669]" /> Budget vs Realisasi
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#5B6B7A]" />
                <select value={projectSort} onChange={e => setProjectSort(e.target.value as ProjectSort)} className="text-xs border border-[#E5EAE8] rounded-xl px-3 h-9 bg-white text-[#0F172A]">
                  <option value="spent_desc">Terpakai terbesar</option>
                  <option value="variance_desc">Over budget</option>
                  <option value="name">Nama A–Z</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-[#E5EAE8]">
              {projectRows.length === 0 ? (
                <div className="p-10 text-center">
                  <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-[#5B6B7A]">Belum ada proyek dengan data keuangan.</p>
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
                      className="w-full p-4 hover:bg-slate-50/60 text-left transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#0F172A] truncate group-hover:text-[#059669]">{p.name}</div>
                          <div className="text-xs text-[#5B6B7A] mt-0.5 flex flex-wrap gap-x-2">
                            <span>Budget {formatRupiah(p.budget)}</span>
                            <span className="text-[#059669] font-medium">Diterima {formatRupiah(p.received)}</span>
                            <span className="text-[#059669] font-medium">Saldo+ {formatRupiah(p.surplus)}</span>
                            {p.interProjectDebt > 0 && (
                              <span className="text-amber-600 font-semibold">Hutang {formatRupiah(p.interProjectDebt)}</span>
                            )}
                            {over && <span className="text-rose-600 font-semibold">Over budget</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <div className={`font-black ${over ? 'text-rose-600' : 'text-[#0F172A]'}`}>{formatRupiah(p.spent)}</div>
                            <div className="text-xs text-[#5B6B7A]">{pct.toFixed(0)}% terpakai</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#5B6B7A] group-hover:text-[#059669]" />
                        </div>
                      </div>
                      <div className="h-2 bg-[#F4F7F5] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-[#059669]'}`}
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
            <section className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E5EAE8] font-bold text-[#0F172A] text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" /> Pinjaman & Hutang Proyek
              </div>
              <div className="divide-y divide-[#E5EAE8] max-h-64 overflow-y-auto">
                {activeTransfers.map(t => {
                  const fromLabel = t.source_type === 'external' && t.type === 'loan'
                    ? (t.counterparty_name || 'Eksternal')
                    : (t.from_project_id ? (projectNameMap[t.from_project_id] || 'Proyek') : '—');
                  const toLabel = t.source_type === 'external' && t.type === 'repayment'
                    ? (t.counterparty_name || 'Eksternal')
                    : (t.to_project_id ? (projectNameMap[t.to_project_id] || 'Proyek') : '—');
                  return (
                  <div key={t.id} className="p-4 text-sm flex justify-between gap-2">
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.type === 'loan' ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200' : 'bg-emerald-50 text-[#059669] border border-emerald-200'}`}>
                        {t.type === 'loan' ? 'Pinjaman' : 'Pelunasan'}
                      </span>
                      {t.source_type === 'external' && (
                        <span className="ml-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">Eksternal</span>
                      )}
                      <span className="ml-2 font-medium text-[#0F172A]">
                        {fromLabel} → {toLabel}
                      </span>
                      <div className="text-xs text-[#5B6B7A] mt-0.5">{t.date}</div>
                    </div>
                    <div className="font-bold text-[#0F172A]">{formatRupiah(t.amount)}</div>
                  </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5EAE8] space-y-3">
              <div className="font-bold text-[#0F172A] flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-[#059669]" /> Transaksi ({filteredTx.length})
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B6B7A]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari keterangan, proyek..."
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <select value={txFilter} onChange={e => setTxFilter(e.target.value as TxFilter)} className="px-3 h-11 rounded-xl border border-[#E5EAE8] text-sm bg-white text-[#0F172A]">
                  <option value="all">Semua tipe</option>
                  <option value="income">Masuk</option>
                  <option value="expense">Keluar</option>
                </select>
                <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="px-3 h-11 rounded-xl border border-[#E5EAE8] text-sm bg-white min-w-[160px] text-[#0F172A]">
                  <option value="all">Semua proyek</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y divide-[#E5EAE8] max-h-[480px] overflow-y-auto">
              {filteredTx.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-[#5B6B7A]">Tidak ada transaksi cocok dengan filter</p>
                </div>
              ) : (
                filteredTx.slice(0, 50).map(c => (
                  <button
                    key={`${c.kind}-${c.id}`}
                    type="button"
                    onClick={() => openProject(c.project_id)}
                    className="w-full p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 text-left group transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.kind === 'income' ? 'bg-emerald-50 text-[#059669] border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {c.kind === 'income' ? 'Masuk' : 'Keluar'}
                        </span>
                        <span className="font-semibold text-[#0F172A] truncate group-hover:text-[#059669]">{c.description}</span>
                      </div>
                      <div className="text-xs text-[#5B6B7A] flex flex-wrap gap-x-2 mt-0.5">
                        <span>{c.date}</span>
                        {projectNameMap[c.project_id] && (
                          <span className="text-[#059669] font-medium">{projectNameMap[c.project_id]}</span>
                        )}
                        {c.meta && <span>· {c.meta}</span>}
                      </div>
                    </div>
                    <div className={`font-bold shrink-0 ${c.kind === 'income' ? 'text-[#059669]' : 'text-rose-600'}`}>
                      {c.kind === 'income' ? '+' : '−'}{formatRupiah(c.amount)}
                    </div>
                  </button>
                ))
              )}
            </div>
            {filteredTx.length > 50 && (
              <p className="p-3 text-center text-xs text-[#5B6B7A] border-t border-[#E5EAE8]">Menampilkan 50 dari {filteredTx.length} transaksi</p>
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
