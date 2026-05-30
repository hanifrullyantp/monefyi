import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, AlertCircle,
  CheckCircle, Users, BarChart3, ChevronRight,
  Sparkles, Activity, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const cashflowData = [
  { date: '1 Jun', income: 50, expense: 20 },
  { date: '5 Jun', income: 120, expense: 45 },
  { date: '10 Jun', income: 80, expense: 60 },
  { date: '15 Jun', income: 150, expense: 80 },
  { date: '20 Jun', income: 90, expense: 55 },
  { date: '25 Jun', income: 200, expense: 90 },
  { date: '30 Jun', income: 160, expense: 70 },
];

const recentActivities = [
  { icon: '💰', text: 'Budi catat pengeluaran Rp 3.2jt — Semen project Rumah Pak Ahmad', time: '5 menit lalu', color: 'bg-amber-50 border-amber-100' },
  { icon: '📊', text: 'Progress Pondasi Gudang Cikarang diupdate: 70% → 75%', time: '23 menit lalu', color: 'bg-blue-50 border-blue-100' },
  { icon: '👷', text: 'Ahmad check in — Site Rumah Pak Ahmad (08:12)', time: '2 jam lalu', color: 'bg-emerald-50 border-emerald-100' },
  { icon: '💡', text: 'AI Recommendation: Budget Semen kritis di Rumah Pak Ahmad', time: '3 jam lalu', color: 'bg-violet-50 border-violet-100' },
  { icon: '✅', text: 'Task Begisting Lantai 1 diselesaikan oleh Rudi', time: '4 jam lalu', color: 'bg-emerald-50 border-emerald-100' },
];

const aiRecommendations = [
  {
    priority: 'critical',
    icon: '🔴',
    title: 'Budget semen hampir habis!',
    detail: 'Semen di project Rumah Pak Ahmad sudah 87% terpakai. Masih ada 5 minggu pengerjaan. Pertimbangkan negosiasi ulang atau alokasi ulang anggaran.',
    actions: ['Lihat Detail', 'Tambah Budget', 'Abaikan'],
    category: 'COST',
  },
  {
    priority: 'high',
    icon: '🟠',
    title: 'Proyek behind schedule 3 hari',
    detail: 'SPI: 0.93 — Rumah Pak Ahmad terlambat 3 hari. Tambah 2 pekerja selama 5 hari atau lembur 2 jam/hari untuk catch up.',
    actions: ['Lihat Opsi', 'Remind Later', 'Abaikan'],
    category: 'SCHEDULE',
  },
  {
    priority: 'medium',
    icon: '🟡',
    title: 'Laporan progress belum diisi',
    detail: '2 hari tidak ada daily log di Gudang Cikarang. Akurasi analisa berkurang. Minta site manager untuk update.',
    actions: ['Kirim Reminder', 'Abaikan'],
    category: 'RISK',
  },
];

function formatRupiah(n: number) {
  if (n >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1)}M`;
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(0)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function Dashboard() {
  const { user, projects, todos } = useAppStore();
  const [expandedRec, setExpandedRec] = useState<number | null>(null);

  const activeProjects = projects.filter(p => p.status === 'active');
  const onTrack = projects.filter(p => p.health_status === 'on_track').length;
  const atRisk = projects.filter(p => p.health_status === 'at_risk').length;
  const behind = projects.filter(p => p.health_status === 'behind').length;
  const todayTodos = todos.filter(t => t.status !== 'done').slice(0, 5);

  const businessCards = [
    { label: 'Omzet Bulan Ini', value: 230000000, change: '+12%', up: true, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Profit Kotor', value: 78000000, change: '33.9% margin', up: true, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pengeluaran Ops', value: 24000000, change: '10.4% dari omzet', up: false, icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Net Profit', value: 54000000, change: '23.5% margin', up: true, icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-xs font-semibold text-rose-700">3 alert kritis</span>
        </div>
      </motion.div>

      {/* Business Snapshot */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Business Snapshot</h2>
          <span className="text-xs text-slate-400">Juni 2025</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {businessCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
              </div>
              <div className="font-black text-slate-900 text-lg">{formatRupiah(card.value)}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${card.up ? 'text-emerald-600' : 'text-amber-600'}`}>
                {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {card.change}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Project Overview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Project Aktif</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-slate-500">On Track: {onTrack}</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-slate-500">At Risk: {atRisk}</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-slate-500">Behind: {behind}</span></span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeProjects.map((proj, i) => {
            const daysLeft = Math.ceil((new Date(proj.end_date).getTime() - Date.now()) / (1000 * 86400));
            const budgetPct = (proj.spent_amount / proj.total_budget_planned) * 100;
            const healthColors = {
              on_track: { bg: 'bg-emerald-50 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
              at_risk: { bg: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-500' },
              behind: { bg: 'bg-rose-50 border-rose-100', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', bar: 'bg-rose-500' },
              ahead: { bg: 'bg-blue-50 border-blue-100', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', bar: 'bg-blue-500' },
            };
            const hc = healthColors[proj.health_status];

            return (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className={`bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-xs font-mono text-slate-400 mb-0.5">{proj.code}</div>
                    <div className="font-bold text-slate-900 text-sm leading-tight truncate">{proj.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{proj.client_name}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${hc.badge}`}>
                    {proj.health_status === 'on_track' ? '✓ On Track' : proj.health_status === 'at_risk' ? '⚠ At Risk' : proj.health_status === 'behind' ? '✗ Behind' : '↑ Ahead'}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span>
                    <span><strong className={hc.badge.includes('rose') ? 'text-rose-700' : 'text-slate-700'}>{proj.progress_percentage}%</strong> / {proj.planned_progress}% planned</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-200 rounded-full relative">
                      <div
                        className={`absolute top-0 left-0 h-full ${hc.bar} rounded-full transition-all`}
                        style={{ width: `${proj.progress_percentage}%` }}
                      />
                      <div
                        className="absolute top-0 left-0 h-full border-r-2 border-slate-500/30"
                        style={{ width: `${proj.planned_progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Budget */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Budget</span>
                    <span><strong>{Math.round(budgetPct)}%</strong> dari {formatRupiah(proj.total_budget_planned)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${budgetPct > 90 ? 'bg-rose-500' : budgetPct > 75 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${daysLeft < 30 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {daysLeft > 0 ? `⏱ ${daysLeft} hari lagi` : `⚠️ Overdue ${Math.abs(daysLeft)} hari`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Today's Agenda & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow Chart */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Cashflow 30 Hari</h2>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Dalam jutaan Rp</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cashflowData}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                formatter={(value) => [`Rp ${value}jt`, '']}
              />
              <Area type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={2} fill="url(#income)" name="Pemasukan" />
              <Area type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={2} fill="url(#expense)" name="Pengeluaran" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-1.5 rounded-full bg-indigo-500" /> Pemasukan
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-1.5 rounded-full bg-amber-500" /> Pengeluaran
            </div>
          </div>
        </section>

        {/* Today's Agenda */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Agenda Hari Ini</h2>
            <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {todayTodos.filter(t => t.status === 'done').length}/{todayTodos.length} selesai
            </div>
          </div>
          <div className="space-y-2">
            {todayTodos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  todo.status === 'done' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-indigo-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  todo.status === 'done' ? 'border-emerald-400 bg-emerald-400' :
                    todo.priority === 'urgent' ? 'border-rose-400' :
                      todo.priority === 'high' ? 'border-amber-400' : 'border-slate-300'
                }`}>
                  {todo.status === 'done' && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${todo.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {todo.title}
                  </p>
                  {todo.due_date && (
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(todo.due_date).toLocaleDateString('id-ID')}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  todo.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                    todo.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                }`}>
                  {todo.priority}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* AI Recommendations */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-800">AI Recommendations</h2>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">3 baru</span>
        </div>
        <div className="space-y-3">
          {aiRecommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                rec.priority === 'critical' ? 'border-rose-200' :
                  rec.priority === 'high' ? 'border-amber-200' : 'border-amber-100'
              }`}
            >
              <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedRec(expandedRec === i ? null : i)}
              >
                <span className="text-xl shrink-0">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{rec.title}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{rec.category}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{rec.detail}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expandedRec === i ? 'rotate-90' : ''}`} />
              </div>
              {expandedRec === i && (
                <div className="px-4 pb-4 pt-0 flex items-center gap-2">
                  {rec.actions.map((action, j) => (
                    <button
                      key={j}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        j === 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                          j === rec.actions.length - 1 ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' :
                            'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Aktivitas Terbaru
          </h2>
          <button className="text-xs text-indigo-600 font-medium">Lihat semua</button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {recentActivities.map((act, i) => (
            <div key={i} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
              <span className="text-xl">{act.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{act.text}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{act.time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Team Status */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" /> Status Tim Hari Ini
          </h2>
          <span className="text-xs text-slate-400">5/8 hadir</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Ahmad R.', status: 'present', time: '08:12', project: 'Site A' },
            { name: 'Budi S.', status: 'present', time: '07:58', project: 'Kantor' },
            { name: 'Rudi H.', status: 'late', time: '09:30', project: 'Site B' },
            { name: 'Sari D.', status: 'absent', time: '-', project: '-' },
          ].map((member, i) => (
            <div key={i} className={`p-3 rounded-xl border text-center ${
              member.status === 'present' ? 'border-emerald-200 bg-emerald-50' :
                member.status === 'late' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto mb-2 ${
                member.status === 'present' ? 'bg-emerald-500' :
                  member.status === 'late' ? 'bg-amber-500' : 'bg-rose-400'
              }`}>
                {member.name.charAt(0)}
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate">{member.name}</div>
              <div className={`text-xs font-medium ${
                member.status === 'present' ? 'text-emerald-600' :
                  member.status === 'late' ? 'text-amber-600' : 'text-rose-500'
              }`}>
                {member.status === 'present' ? `✓ ${member.time}` : member.status === 'late' ? `⚠ ${member.time}` : '✗ Tidak hadir'}
              </div>
              <div className="text-xs text-slate-400 truncate">{member.project}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
