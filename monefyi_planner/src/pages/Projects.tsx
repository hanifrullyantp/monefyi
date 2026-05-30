import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, Grid, List, ChevronRight,
  MapPin, Users, Calendar, TrendingUp, BarChart3,
  Clock, FolderOpen, X, CheckCircle,
  AlertTriangle, Sparkles, Target, Layers,
  Trash2, Edit3, UserPlus, Camera,
  CloudRain, Sun, Info, MoreHorizontal, Activity, FileText
} from 'lucide-react';
import { useAppStore, Project } from '../store/appStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from 'recharts';

// --- MOCK DATA FOR REFINEMENT ---

const sCurveData = [
  { week: 'W1', planned: 5, actual: 4 },
  { week: 'W2', planned: 12, actual: 10 },
  { week: 'W3', planned: 20, actual: 17 },
  { week: 'W4', planned: 30, actual: 25 },
  { week: 'W5', planned: 42, actual: 38 },
  { week: 'W6', planned: 55, actual: 50 },
  { week: 'W7', planned: 65, actual: 61 },
  { week: 'W8', planned: 72, actual: 67 },
];

const rapData = [
  { name: 'Material', planned: 200, actual: 165 },
  { name: 'Tenaga', planned: 120, actual: 95 },
  { name: 'Alat', planned: 60, actual: 45 },
  { name: 'Overhead', planned: 40, actual: 30 },
  { name: 'Lainnya', planned: 30, actual: 15 },
];

const scheduleTasks = [
  { id: 1, phase: 'Fase Persiapan', tasks: [
    { name: 'Pembersihan Lahan', start: '2025-01-01', end: '2025-01-05', progress: 100, workers: 4 },
    { name: 'Pagar Proyek', start: '2025-01-05', end: '2025-01-10', progress: 100, workers: 3 },
  ]},
  { id: 2, phase: 'Fase Pondasi', tasks: [
    { name: 'Galian Tanah', start: '2025-01-10', end: '2025-01-20', progress: 100, workers: 6 },
    { name: 'Pondasi Batu Kali', start: '2025-01-20', end: '2025-02-05', progress: 85, workers: 8 },
  ]},
  { id: 3, phase: 'Fase Struktur', tasks: [
    { name: 'Kolom Lantai 1', start: '2025-02-05', end: '2025-02-20', progress: 40, workers: 5 },
    { name: 'Dak Lantai 2', start: '2025-02-20', end: '2025-03-10', progress: 0, workers: 10 },
  ]},
];

const projectLogs = [
  { date: '15 Jun 2025', user: 'Ahmad R.', text: 'Pemasangan bekisting kolom C1-C4 selesai. Cuaca cerah.', weather: 'sun', progress: '+2%', photos: 3 },
  { date: '14 Jun 2025', user: 'Budi S.', text: 'Pengecoran tertunda 2 jam karena hujan deras siang hari.', weather: 'rain', progress: '+0.5%', photos: 1 },
  { date: '13 Jun 2025', user: 'Ahmad R.', text: 'Material besi D13 masuk 150 batang. Mulai perakitan tulangan.', weather: 'sun', progress: '+1.5%', photos: 4 },
];

const teamMembers = [
  { name: 'Budi Santoso', role: 'Project Manager', avatar: 'BS', status: 'online' },
  { name: 'Ahmad Rizky', role: 'Site Supervisor', avatar: 'AR', status: 'online' },
  { name: 'Rudi Hartono', role: 'Logistik', avatar: 'RH', status: 'offline' },
  { name: 'Siti Aminah', role: 'Admin Proyek', avatar: 'SA', status: 'online' },
];

function formatRupiah(n: number) {
  if (n >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1)}M`;
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(0)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

// --- COMPONENTS ---

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
}

function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('biaya');
  
  const budgetPct = (project.spent_amount / project.total_budget_planned) * 100;
  const daysLeft = Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 86400));
  const cpi = (project.progress_percentage / 100) / (project.spent_amount / project.total_budget_planned);
  const spi = project.progress_percentage / project.planned_progress;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'planning', label: 'Planning', icon: Layers },
    { id: 'realisasi', label: 'Realisasi', icon: TrendingUp },
    { id: 'laporan', label: 'Laporan', icon: BarChart3 },
    { id: 'tim', label: 'Tim', icon: Users },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white w-full max-w-5xl h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header Proyek */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-6 text-white shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-md text-white">{project.code}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  project.health_status === 'on_track' ? 'bg-emerald-400 text-white' :
                  project.health_status === 'at_risk' ? 'bg-amber-400 text-white' : 'bg-rose-400 text-white'
                }`}>
                  {project.health_status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black truncate">{project.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-indigo-100 text-xs">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {project.location}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {teamMembers.length} anggota tim</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all ml-4">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-white/10 rounded-2xl p-4 border border-white/10">
            <div className="text-center">
              <div className="text-sm text-indigo-100 mb-1">Progres Aktual</div>
              <div className="text-2xl font-black">{project.progress_percentage}%</div>
              <div className="text-[10px] text-indigo-200">Rencana: {project.planned_progress}%</div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-sm text-indigo-100 mb-1">Biaya Terpakai</div>
              <div className="text-2xl font-black">{Math.round(budgetPct)}%</div>
              <div className="text-[10px] text-indigo-200">{formatRupiah(project.spent_amount)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-indigo-100 mb-1">Sisa Waktu</div>
              <div className="text-2xl font-black">{daysLeft > 0 ? daysLeft : 'OD'}</div>
              <div className="text-[10px] text-indigo-200">{daysLeft > 0 ? 'Hari kerja' : `Terlambat ${Math.abs(daysLeft)} hari`}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigasi */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-white sticky top-0 z-10 px-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Konten Utama */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Metrik EVM */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'CPI', value: cpi.toFixed(2), desc: 'Efisiensi Biaya', status: cpi >= 1 ? 'ok' : 'bad' },
                    { label: 'SPI', value: spi.toFixed(2), desc: 'Efisiensi Jadwal', status: spi >= 1 ? 'ok' : 'bad' },
                    { label: 'CV', value: formatRupiah(project.total_budget_planned * 0.05), desc: 'Cost Variance', status: 'ok' },
                    { label: 'SV', value: '-3 Hari', desc: 'Schedule Variance', status: 'bad' },
                  ].map((m, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                      <div className={`text-2xl font-black mb-1 ${m.status === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.value}
                      </div>
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">{m.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{m.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Kurva S Preview */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" /> Analisa Kurva S
                    </h3>
                    <div className="flex gap-4 text-[10px]">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-500" /> Rencana</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500" /> Aktual</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={sCurveData}>
                      <defs>
                        <linearGradient id="pPlanned" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="pActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="planned" stroke="#6366f1" strokeWidth={3} fill="url(#pPlanned)" strokeDasharray="5 5" />
                      <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fill="url(#pActual)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Aktivitas Terbaru & AI Alert */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" /> Aktivitas Terbaru
                    </h3>
                    <div className="space-y-4">
                      {projectLogs.slice(0, 3).map((log, i) => (
                        <div key={i} className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-indigo-50 text-indigo-600`}>
                            {log.user.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 leading-relaxed"><strong className="text-slate-900">{log.user}</strong> {log.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400">{log.date}</span>
                              <span className="text-[10px] text-emerald-600 font-bold">{log.progress}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                    <h3 className="font-bold text-amber-800 mb-3 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" /> AI Insights
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-white/60 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                        <strong className="block mb-1">⚠️ Risiko Keterlambatan</strong>
                        SPI 0.93 menunjukkan proyek terlambat 3 hari dari rencana. Butuh akselerasi di Fase Struktur.
                      </div>
                      <div className="p-3 bg-white/60 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                        <strong className="block mb-1">💰 Efisiensi Material</strong>
                        Penggunaan besi beton 12% lebih hemat dari estimasi di fase ini. Rekomendasi: Gunakan sisa dana untuk percepatan tenaga kerja.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'planning' && (
              <motion.div key="planning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex p-1 bg-slate-200 rounded-xl w-fit mb-4">
                  {['RAP', 'Schedule'].map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveSubTab(t.toLowerCase())}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeSubTab === t.toLowerCase() ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {activeSubTab === 'rap' ? (
                  <div className="space-y-4">
                    {['Material', 'Tenaga Kerja', 'Alat & Equipment'].map((cat, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">{cat}</h4>
                          <span className="text-xs font-bold text-slate-500">Subtotal: {formatRupiah(i === 0 ? 150000000 : 50000000)}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {i === 0 ? (
                            [
                              { item: 'Semen Portland 40kg', qty: '500 sak', price: '65rb', total: '32.5jt', progress: 85 },
                              { item: 'Pasir Pasang', qty: '20 m³', price: '280rb', total: '5.6jt', progress: 40 },
                              { item: 'Besi D13', qty: '150 btg', price: '87rb', total: '13jt', progress: 60 },
                            ].map((row, j) => (
                              <div key={j} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="text-sm font-bold text-slate-800">{row.item}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">{row.qty} × Rp {row.price} / unit</div>
                                  <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden w-2/3">
                                    <div className={`h-full bg-indigo-500 rounded-full`} style={{ width: `${row.progress}%` }} />
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-black text-slate-900">Rp {row.total}</div>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${row.progress > 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {row.progress}% terealisasi
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center text-xs text-slate-400 italic">Data kategori {cat} lainnya...</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-x-auto">
                    <div className="min-w-[600px] space-y-6">
                      {scheduleTasks.map((phase) => (
                        <div key={phase.id}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                            <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">{phase.phase}</h4>
                          </div>
                          <div className="space-y-3 pl-4">
                            {phase.tasks.map((task, j) => (
                              <div key={j} className="relative">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span className="font-bold text-slate-700">{task.name}</span>
                                  <span className="text-slate-400">{task.start} — {task.end}</span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-lg overflow-hidden flex items-center">
                                  <div 
                                    className={`h-full rounded-lg relative transition-all duration-1000 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${task.progress}%` }}
                                  >
                                    {task.progress > 0 && (
                                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white">
                                        {task.progress}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[10px] flex items-center gap-1 text-slate-500">
                                    <Users className="w-3 h-3" /> {task.workers} pekerja
                                  </span>
                                  <span className="text-[10px] flex items-center gap-1 text-slate-500">
                                    <Clock className="w-3 h-3" /> {Math.ceil((new Date(task.end).getTime() - new Date(task.start).getTime()) / 86400000)} hari
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'realisasi' && (
              <motion.div key="realisasi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex p-1 bg-slate-200 rounded-xl w-fit">
                    {['Biaya', 'Progres'].map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveSubTab(t.toLowerCase())}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeSubTab === t.toLowerCase() ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                    <Plus className="w-3.5 h-3.5" /> {activeSubTab === 'biaya' ? 'Catat Biaya' : 'Log Harian'}
                  </button>
                </div>

                {activeSubTab === 'biaya' ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-black uppercase tracking-wider">Tanggal</th>
                          <th className="px-4 py-3 font-black uppercase tracking-wider">Item / Kategori</th>
                          <th className="px-4 py-3 font-black uppercase tracking-wider text-right">Volume</th>
                          <th className="px-4 py-3 font-black uppercase tracking-wider text-right">Total</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {[
                          { date: '15 Jun', item: 'Semen Portland', cat: 'Material', qty: '50 sak', total: 3250000 },
                          { date: '14 Jun', item: 'Pasir Beton', cat: 'Material', qty: '5 m³', total: 1400000 },
                          { date: '13 Jun', item: 'Upah Tukang (2 hari)', cat: 'Tenaga', qty: '12 HOK', total: 1800000 },
                          { date: '10 Jun', item: 'Besi Beton D13', cat: 'Material', qty: '50 btg', total: 4350000 },
                        ].map((tx, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5 font-medium text-slate-500">{tx.date}</td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-800">{tx.item}</div>
                              <div className="text-[10px] text-slate-400">{tx.cat}</div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-slate-700">{tx.qty}</td>
                            <td className="px-4 py-3.5 text-right font-black text-slate-900">{formatRupiah(tx.total)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <button className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectLogs.map((log, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                              {log.user.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{log.user}</div>
                              <div className="text-[10px] text-slate-400">{log.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.weather === 'sun' ? <Sun className="w-4 h-4 text-amber-500" /> : <CloudRain className="w-4 h-4 text-blue-400" />}
                            <span className="text-xs font-black text-emerald-600">{log.progress}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4">{log.text}</p>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: log.photos }).map((_, j) => (
                            <div key={j} className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group cursor-pointer relative overflow-hidden">
                              <Camera className="w-5 h-5 text-slate-300" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                          ))}
                          <button className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'tim' && (
              <motion.div key="tim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-sm">Anggota Tim Proyek ({teamMembers.length})</h3>
                  <button className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-100">
                    <UserPlus className="w-3.5 h-3.5" /> Tambah Anggota
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamMembers.map((member, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-all group">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
                          {member.avatar}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-slate-900 text-sm">{member.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{member.role}</div>
                      </div>
                      <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-xl transition-all">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 text-sm mb-4">Ringkasan Beban Kerja</h4>
                  <div className="space-y-4">
                    {[
                      { name: 'Ahmad Rizky', tasks: 4, load: 85 },
                      { name: 'Budi Santoso', tasks: 2, load: 40 },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-bold text-indigo-700">{item.name}</span>
                          <span className="text-indigo-500">{item.tasks} tasks aktif · {item.load}% beban</span>
                        </div>
                        <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.load > 80 ? 'bg-amber-500' : 'bg-indigo-500'} rounded-full`} style={{ width: `${item.load}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'laporan' && (
              <motion.div key="laporan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm">Distribusi Biaya per Kategori</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={rapData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                        <Bar dataKey="planned" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Rencana (jt)" />
                        <Bar dataKey="actual" fill="#6366f1" radius={[0, 4, 4, 0]} name="Aktual (jt)">
                          {rapData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.actual > entry.planned ? '#f43f5e' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-[10px] text-slate-400 text-center">*Nilai dalam jutaan rupiah</div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <h3 className="font-black text-2xl text-slate-900">1.03</h3>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Overall Performance Index</div>
                    <p className="text-xs text-slate-400 mt-2 px-6">Proyek berjalan cukup efisien. Estimasi margin akhir: <strong className="text-emerald-600">32.5%</strong></p>
                    <button className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" /> Download Laporan PDF
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-sm">Tabel Earned Value Management (EVM)</h4>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 font-black uppercase tracking-wider">Metrik</th>
                        <th className="px-5 py-3 font-black uppercase tracking-wider text-right">Nilai</th>
                        <th className="px-5 py-3 font-black uppercase tracking-wider">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { m: 'PV (BCWS)', v: formatRupiah(project.total_budget_planned * 0.72), d: 'Rencana kerja s.d hari ini' },
                        { m: 'EV (BCWP)', v: formatRupiah(project.total_budget_planned * 0.67), d: 'Nilai kerja yang diselesaikan' },
                        { m: 'AC (ACWP)', v: formatRupiah(project.spent_amount), d: 'Biaya aktual yang dikeluarkan' },
                        { m: 'EAC', v: formatRupiah(project.total_budget_planned / 1.03), d: 'Estimasi total biaya saat selesai' },
                        { m: 'VAC', v: formatRupiah(project.total_budget_planned * 0.03), d: 'Estimasi penghematan/pemborosan' },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td className="px-5 py-3.5 font-bold text-slate-800">{row.m}</td>
                          <td className="px-5 py-3.5 text-right font-black text-slate-900">{row.v}</td>
                          <td className="px-5 py-3.5 text-slate-500">{row.d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Quick Action */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 safe-bottom">
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
             <button className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">
               Arsip Proyek
             </button>
             <button className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors">
               Update Status
             </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900">Buat Proyek Baru</h3>
              <p className="text-xs text-slate-400">Step {step} dari 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Nama Proyek</label>
                  <input placeholder="Contoh: Rumah Pak Ahmad" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Tipe</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm">
                      <option>Konstruksi</option>
                      <option>Interior</option>
                      <option>Renovasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Kode Proyek</label>
                    <input defaultValue="PRJ-2025-001" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Lokasi</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input placeholder="Alamat atau titik koordinat" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Tanggal Mulai</label>
                    <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Estimasi Selesai</label>
                    <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Estimasi Total Budget</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                    <input type="number" placeholder="0" className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-sm font-bold" />
                  </div>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-indigo-700 leading-relaxed">Nilai budget ini akan menjadi acuan (BAC) dalam perhitungan Earned Value Management (EVM) proyek Anda.</p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="text-center space-y-4 py-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h4 className="font-black text-xl text-slate-900">Konfigurasi Selesai!</h4>
                <p className="text-sm text-slate-500 px-6">Proyek kamu sudah siap dibuat. Kami akan mengaktifkan fitur asisten AI untuk memantau progres ini secara otomatis.</p>
                <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2">Pilih Template Awal (Opsional):</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:border-indigo-400 transition-all">Kosong (Mulai dari Nol)</button>
                    <button className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:border-indigo-400 transition-all">Gunakan Template RAP Konstruksi</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">
              Kembali
            </button>
          )}
          <button 
            onClick={() => step < 3 ? setStep(step + 1) : onClose()} 
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            {step === 3 ? '🎉 Buat Proyek Sekarang!' : 'Lanjut'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- MAIN PAGE ---

export default function Projects() {
  const { projects } = useAppStore();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filters = [
    { id: 'all', label: 'Semua', count: projects.length },
    { id: 'active', label: 'Aktif', count: projects.filter(p => p.status === 'active').length },
    { id: 'on_track', label: 'On Track', count: projects.filter(p => p.health_status === 'on_track').length },
    { id: 'at_risk', label: 'At Risk', count: projects.filter(p => p.health_status === 'at_risk').length },
    { id: 'behind', label: 'Behind', count: projects.filter(p => p.health_status === 'behind').length },
  ];

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'active' ? p.status === 'active' : p.health_status === filter);
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Manajemen Proyek</h1>
          <p className="text-sm text-slate-500 font-medium">Monitoring & kontrol seluruh proyek dalam satu dashboard.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-xl shadow-indigo-100 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> 
          Buat Proyek Baru
        </button>
      </div>

      {/* Kontrol & Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama proyek, klien, atau kode..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Grid className="w-4.5 h-4.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <List className="w-4.5 h-4.5" />
              </button>
            </div>
            <button className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter Lanjut
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                filter === f.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:text-slate-700'
              }`}
            >
              {f.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${filter === f.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Proyek */}
      <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
        {filtered.map((proj, i) => {
          const budgetPct = (proj.spent_amount / proj.total_budget_planned) * 100;
          const daysLeft = Math.ceil((new Date(proj.end_date).getTime() - Date.now()) / (1000 * 86400));
          const health = {
            on_track: { bg: 'bg-emerald-500', text: 'text-emerald-700', box: 'border-emerald-100 bg-emerald-50/30' },
            at_risk: { bg: 'bg-amber-500', text: 'text-amber-700', box: 'border-amber-100 bg-amber-50/30' },
            behind: { bg: 'bg-rose-500', text: 'text-rose-700', box: 'border-rose-100 bg-rose-50/30' },
            ahead: { bg: 'bg-blue-500', text: 'text-blue-700', box: 'border-blue-100 bg-blue-50/30' },
          }[proj.health_status] || { bg: 'bg-slate-500', text: 'text-slate-700', box: 'border-slate-100' };

          if (viewMode === 'list') {
            return (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedProject(proj)}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-5 hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className={`w-3 h-14 rounded-full ${health.bg}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{proj.code}</span>
                    <span className={`text-[10px] font-black uppercase ${health.text}`}>{proj.health_status.replace('_', ' ')}</span>
                  </div>
                  <h3 className="font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{proj.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Users className="w-3 h-3" /> {proj.client_name}</div>
                </div>
                <div className="hidden md:flex flex-col items-end shrink-0 w-24">
                  <div className="text-lg font-black text-slate-900">{proj.progress_percentage}%</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Progres</div>
                </div>
                <div className="hidden md:flex flex-col items-end shrink-0 w-32">
                  <div className="text-sm font-black text-slate-900">{formatRupiah(proj.spent_amount)}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Biaya</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-all" />
              </motion.div>
            );
          }

          return (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelectedProject(proj)}
              className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-2xl hover:border-indigo-200 transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-slate-400">{proj.code}</span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${health.box.split(' ')[0]} ${health.text}`}>
                      {proj.health_status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{proj.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {proj.client_name}</p>
                </div>
                <div className={`w-10 h-10 rounded-2xl ${health.box.split(' ')[1]} flex items-center justify-center shrink-0`}>
                  <FolderOpen className={`w-5 h-5 ${health.text}`} />
                </div>
              </div>

              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Progres Kerja</span>
                    <span className="font-black text-slate-900">{proj.progress_percentage}% <span className="text-slate-300 font-normal">/ {proj.planned_progress}%</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-50">
                    <div className={`h-full ${health.bg} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${proj.progress_percentage}%` }} />
                    <div className="absolute top-0 h-full border-r-2 border-slate-400/30" style={{ left: `${proj.planned_progress}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Realisasi Budget</span>
                    <span className="font-black text-slate-900">{Math.round(budgetPct)}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${budgetPct > 90 ? 'bg-rose-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${budgetPct}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-bold">
                    <span>{formatRupiah(proj.spent_amount)}</span>
                    <span>Sisa: {formatRupiah(proj.total_budget_planned - proj.spent_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                   <div className="flex -space-x-2">
                     {Array.from({ length: 3 }).map((_, j) => (
                       <div key={j} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500">
                         {['AR', 'BS', 'RH'][j]}
                       </div>
                     ))}
                   </div>
                   <span className="text-[10px] text-slate-400 font-medium">+2 lainnya</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-600 group-hover:gap-2.5 transition-all">
                  Kelola <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="font-black text-xl text-slate-800">Proyek tidak ditemukan</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">Coba sesuaikan kata kunci pencarian atau filter yang kamu gunakan.</p>
          <button onClick={() => { setSearch(''); setFilter('all'); }} className="mt-6 text-indigo-600 font-bold text-sm hover:underline">Reset Filter</button>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedProject && <ProjectDetail project={selectedProject} onClose={() => setSelectedProject(null)} />}
        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}
