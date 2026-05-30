import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ArrowDownRight, PieChart, BarChart3, Filter, Search,
  Building2, FolderOpen, Receipt
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell
} from 'recharts';

function formatRupiah(n: number) {
  if (n >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1)}M`;
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(0)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const accounts = [
  { name: 'BCA Utama', type: 'bank', balance: 185000000, color: 'from-blue-500 to-blue-600', icon: '🏦' },
  { name: 'Mandiri Bisnis', type: 'bank', balance: 72000000, color: 'from-amber-500 to-orange-500', icon: '🏦' },
  { name: 'Kas Kecil', type: 'cash', balance: 8500000, color: 'from-emerald-500 to-teal-600', icon: '💵' },
  { name: 'Dana E-wallet', type: 'ewallet', balance: 2300000, color: 'from-violet-500 to-purple-600', icon: '📱' },
];

const plData = [
  { month: 'Jan', income: 180, expense: 120, profit: 60 },
  { month: 'Feb', income: 220, expense: 140, profit: 80 },
  { month: 'Mar', income: 160, expense: 110, profit: 50 },
  { month: 'Apr', income: 280, expense: 160, profit: 120 },
  { month: 'Mei', income: 250, expense: 155, profit: 95 },
  { month: 'Jun', income: 230, expense: 145, profit: 85 },
];

const expenseCategories = [
  { name: 'Material', value: 45, color: '#6366f1' },
  { name: 'Tenaga', value: 25, color: '#8b5cf6' },
  { name: 'Operasional', value: 15, color: '#a78bfa' },
  { name: 'Gaji Kantor', value: 10, color: '#c4b5fd' },
  { name: 'Lainnya', value: 5, color: '#ddd6fe' },
];

const pnlItems = [
  { label: 'OMZET / PENDAPATAN', value: 230000000, indent: 0, bold: true, positive: true },
  { label: '└ Pembayaran Project', value: 195000000, indent: 1, positive: true },
  { label: '└ Retainer & Konsultasi', value: 35000000, indent: 1, positive: true },
  { label: '(Biaya Langsung Project)', value: -152000000, indent: 0, positive: false },
  { label: '= LABA KOTOR', value: 78000000, indent: 0, bold: true, positive: true },
  { label: '(Biaya Operasional)', value: -24000000, indent: 0, positive: false },
  { label: '└ Gaji Karyawan Kantor', value: -12000000, indent: 1, positive: false },
  { label: '└ Sewa Kantor', value: -5000000, indent: 1, positive: false },
  { label: '└ Utilities & Internet', value: -2500000, indent: 1, positive: false },
  { label: '└ Marketing', value: -2000000, indent: 1, positive: false },
  { label: '└ Lainnya', value: -2500000, indent: 1, positive: false },
  { label: '= LABA OPERASIONAL', value: 54000000, indent: 0, bold: true, positive: true },
  { label: '(Estimasi Pajak 2%)', value: -1080000, indent: 0, positive: false },
  { label: '= LABA BERSIH', value: 52920000, indent: 0, bold: true, positive: true },
];

export default function Finance() {
  const { transactions } = useAppStore();
  const [activeTab, setActiveTab] = useState('bisnis');
  const [showAddModal, setShowAddModal] = useState(false);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">Keuangan</h1>
          <p className="text-sm text-slate-500">Saldo total: <strong className="text-slate-800">{formatRupiah(totalBalance)}</strong></p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-200 text-sm"
        >
          <Plus className="w-4 h-4" /> Catat Transaksi
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-6">
        {[
          { id: 'bisnis', label: '🏢 Bisnis', icon: Building2 },
          { id: 'project', label: '📁 Project', icon: FolderOpen },
          { id: 'laporan', label: '📊 Laporan', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'bisnis' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <div className="text-xs text-emerald-600 mb-1 font-medium">Pemasukan</div>
              <div className="font-black text-emerald-800 text-lg">{formatRupiah(totalIncome)}</div>
              <div className="text-xs text-emerald-500 flex items-center gap-0.5 justify-center mt-0.5"><ArrowUpRight className="w-3 h-3" /> +12%</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <div className="text-xs text-rose-600 mb-1 font-medium">Pengeluaran</div>
              <div className="font-black text-rose-800 text-lg">{formatRupiah(totalExpense)}</div>
              <div className="text-xs text-rose-500 flex items-center gap-0.5 justify-center mt-0.5"><ArrowDownRight className="w-3 h-3" /> +8%</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
              <div className="text-xs text-indigo-600 mb-1 font-medium">Net Profit</div>
              <div className="font-black text-indigo-800 text-lg">{formatRupiah(totalIncome - totalExpense)}</div>
              <div className="text-xs text-indigo-500 flex items-center gap-0.5 justify-center mt-0.5"><TrendingUp className="w-3 h-3" /> 23.5%</div>
            </div>
          </div>

          {/* Accounts */}
          <div>
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" /> Akun Kas & Bank
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {accounts.map((acc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-gradient-to-br ${acc.color} rounded-2xl p-4 text-white cursor-pointer hover:opacity-90 transition-opacity`}
                >
                  <div className="text-2xl mb-2">{acc.icon}</div>
                  <div className="text-xs text-white/80 mb-1">{acc.name}</div>
                  <div className="font-black text-lg leading-tight">{formatRupiah(acc.balance)}</div>
                  <div className="text-xs text-white/60 capitalize mt-1">{acc.type}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* P&L */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4">P&L Bulan Juni 2025</h2>
              <div className="space-y-1">
                {pnlItems.map((item, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center py-1.5 text-sm ${item.bold ? 'font-black border-t border-slate-200 mt-2 pt-2' : ''}`}
                    style={{ paddingLeft: item.indent ? item.indent * 12 : 0 }}
                  >
                    <span className={item.bold ? 'text-slate-900' : 'text-slate-600'}>{item.label}</span>
                    <span className={`font-semibold ${item.positive ? (item.bold ? 'text-emerald-700' : 'text-slate-700') : 'text-rose-600'}`}>
                      {item.positive ? '' : '('}{formatRupiah(Math.abs(item.value))}{item.positive ? '' : ')'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* Revenue vs Expense Chart */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
                <h2 className="font-bold text-slate-800 mb-4">6 Bulan Terakhir</h2>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={plData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="jt" />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} name="Pemasukan (jt)" />
                    <Bar dataKey="expense" fill="#f1f5f9" radius={[4, 4, 0, 0]} name="Pengeluaran (jt)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="font-bold text-slate-800 mb-3">Komposisi Pengeluaran</h2>
                <div className="flex items-center gap-4">
                  <RechartsPie width={100} height={100}>
                    <Pie data={expenseCategories} cx={50} cy={50} outerRadius={45} innerRadius={25} dataKey="value">
                      {expenseCategories.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPie>
                  <div className="flex-1 space-y-1.5">
                    {expenseCategories.map((cat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                        <span className="text-xs text-slate-600 flex-1">{cat.name}</span>
                        <span className="text-xs font-bold text-slate-800">{cat.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800">Transaksi Terbaru</h2>
              <button className="text-xs text-indigo-600 font-medium">Lihat semua</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              {transactions.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{tx.description}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{tx.category}</span>
                      <span>·</span>
                      <span>{tx.account}</span>
                      {tx.project_id && <><span>·</span><span className="text-indigo-500">Project</span></>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </div>
                    <div className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'project' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4">RAP vs Realisasi per Proyek</h2>
            <div className="space-y-4">
              {[
                { name: 'Rumah Pak Ahmad', budget: 450000000, spent: 280000000, pct: 62 },
                { name: 'Gudang Logistik PT Maju', budget: 1200000000, spent: 480000000, pct: 40 },
                { name: 'Renovasi Kantor CV Sentosa', budget: 280000000, spent: 75000000, pct: 27 },
                { name: 'Toko Modern Pak Budi', budget: 180000000, spent: 90000000, pct: 50 },
              ].map((proj, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-slate-800">{proj.name}</span>
                    <span className="text-slate-500">{formatRupiah(proj.spent)} / {formatRupiah(proj.budget)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${proj.pct > 80 ? 'bg-rose-500' : proj.pct > 60 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${proj.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{proj.pct}% terpakai</span>
                    <span>{100 - proj.pct}% sisa</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total RAP Aktif', value: '2.11M', sub: '4 project aktif', icon: FolderOpen, color: 'indigo' },
              { label: 'Total Realisasi', value: '925jt', sub: 'Semua project', icon: Receipt, color: 'amber' },
              { label: 'Avg. CPI', value: '1.03', sub: 'Efisiensi rata-rata', icon: TrendingUp, color: 'emerald' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500 font-medium">{card.label}</span>
                  <div className={`w-8 h-8 rounded-xl bg-${card.color}-50 flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 text-${card.color}-600`} />
                  </div>
                </div>
                <div className="font-black text-2xl text-slate-900">Rp {card.value}</div>
                <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'laporan' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4">P&L Konsolidasi 6 Bulan</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={plData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="jt" />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} name="Pemasukan" />
                <Bar dataKey="expense" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Pengeluaran" />
                <Bar dataKey="profit" fill="#34d399" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Total 6 Bulan</h3>
              {[
                { label: 'Total Pemasukan', value: formatRupiah(1320000000), color: 'text-emerald-600' },
                { label: 'Total Pengeluaran', value: formatRupiah(830000000), color: 'text-rose-600' },
                { label: 'Net Profit', value: formatRupiah(490000000), color: 'text-indigo-700 font-black' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white">
              <div className="text-sm font-medium text-indigo-200 mb-2">Estimasi Laba Q2 2025</div>
              <div className="text-3xl font-black mb-1">Rp 490jt</div>
              <div className="text-indigo-200 text-xs mb-4">Margin: 37.1%</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-indigo-100">
                  <span>Dividen (30%)</span>
                  <span className="font-bold">Rp 147jt</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-100">
                  <span>Laba Ditahan (70%)</span>
                  <span className="font-bold">Rp 343jt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
