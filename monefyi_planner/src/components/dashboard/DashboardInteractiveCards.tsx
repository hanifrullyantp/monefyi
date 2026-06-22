import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen, Wallet, AlertTriangle, Users, ChevronRight,
  BarChart3, Target, Bell,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getProjectStats } from '../../services/projectService';
import { aggregateCashflow, aggregateByProject } from '../../services/costService';
import { getOrgFinanceTotals, aggregateNetCashflow } from '../../services/projectFinanceService';
import { getTodayAttendanceSummary, buildAttentionItems } from '../../services/dashboardService';
import { analyzeProject } from '../../services/analyzeService';
import BottomSheet from '../ui/BottomSheet';
import MetricMiniCard from '../ui/MetricMiniCard';
import { formatRupiah, HEALTH_CONFIG, daysUntil } from '../../utils/projectUi';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function formatRupiahShort(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

interface Props {
  onOpenProject?: (id: string) => void;
}

type SheetId = 'projects' | 'finance' | 'attention' | 'staff' | null;

export default function DashboardInteractiveCards({ onOpenProject }: Props) {
  const { projects, tenant, setActiveTab, setCommandModalOpen } = useAppStore();
  const [sheet, setSheet] = useState<SheetId>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, totalBudget: 0, totalSpent: 0, atRisk: 0, avgProgress: 0 });
  const [financeTotals, setFinanceTotals] = useState({ totalInflow: 0, totalOutflow: 0, netCash: 0 });
  const [cashflow, setCashflow] = useState<{ date: string; inflow: number; outflow: number; net: number }[]>([]);
  const [byProject, setByProject] = useState<Awaited<ReturnType<typeof aggregateByProject>>>([]);
  const [attendance, setAttendance] = useState({ present: 0, total: 0 });
  const [attention, setAttention] = useState<ReturnType<typeof buildAttentionItems>>([]);
  const [projectRecs, setProjectRecs] = useState<Array<{ title: string; message: string }>>([]);

  const activeProjects = projects.filter(p => p.status === 'active');
  const firstActiveProjectId = activeProjects[0]?.id ?? '';
  const selectedProject = projects.find(p => p.id === selectedProjectId) || activeProjects[0] || projects[0];

  useEffect(() => {
    if (!tenant?.id) return;
    getProjectStats(tenant.id).then(setStats).catch(console.error);
    getOrgFinanceTotals(tenant.id).then(f => setFinanceTotals({
      totalInflow: f.totalInflow,
      totalOutflow: f.totalOutflow,
      netCash: f.netCash,
    })).catch(console.error);
    aggregateNetCashflow(tenant.id, 7).then(setCashflow).catch(console.error);
    aggregateByProject(tenant.id).then(setByProject).catch(console.error);
    getTodayAttendanceSummary(tenant.id).then(a => setAttendance({ present: a.present, total: a.total })).catch(console.error);
    setAttention(buildAttentionItems(projects));
  }, [tenant?.id, projects]);

  useEffect(() => {
    if (firstActiveProjectId && !selectedProjectId) setSelectedProjectId(firstActiveProjectId);
  }, [firstActiveProjectId, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    analyzeProject(selectedProject.id).then(r => {
      setProjectRecs((r?.recommendations || []).slice(0, 3).map(x => ({ title: x.title, message: x.message })));
    }).catch(() => setProjectRecs([]));
  }, [selectedProject?.id]);

  const monthSpent = stats.totalSpent;

  const cards = [
    {
      id: 'projects' as const,
      label: 'Proyek',
      value: `${stats.activeProjects} / ${stats.totalProjects}`,
      sub: 'aktif dari total',
      icon: FolderOpen,
      gradient: 'from-blue-500/10 to-emerald-500/5',
      iconColor: 'text-blue-600',
    },
    {
      id: 'finance' as const,
      label: 'Keuangan',
      value: formatRupiahShort(financeTotals.netCash),
      sub: `masuk ${formatRupiahShort(financeTotals.totalInflow)} · keluar ${formatRupiahShort(financeTotals.totalOutflow)}`,
      icon: Wallet,
      gradient: 'from-emerald-500/10 to-teal-500/5',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'attention' as const,
      label: 'Perhatian',
      value: String(attention.length),
      sub: attention.length ? 'perlu ditindak' : 'semua aman',
      icon: AlertTriangle,
      gradient: attention.length ? 'from-amber-500/15 to-orange-500/5' : 'from-slate-500/5 to-slate-500/5',
      iconColor: attention.length ? 'text-amber-600' : 'text-slate-500',
    },
    {
      id: 'staff' as const,
      label: 'Karyawan',
      value: attendance.total ? `${attendance.present} / ${attendance.total}` : '—',
      sub: 'hadir hari ini',
      icon: Users,
      gradient: 'from-emerald-500/10 to-emerald-500/5',
      iconColor: 'text-emerald-600',
    },
  ];

  const budgetPct = selectedProject
    ? (selectedProject.total_budget_planned
      ? (selectedProject.spent_amount / selectedProject.total_budget_planned) * 100
      : 0)
    : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <motion.button
            key={card.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSheet(card.id)}
            className={`relative text-left bg-gradient-to-br ${card.gradient} bg-white rounded-2xl p-4 border border-slate-100 shadow-sm overflow-hidden`}
          >
            <card.icon className={`absolute top-3 right-3 w-10 h-10 opacity-15 ${card.iconColor}`} />
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</div>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">{card.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{card.sub}</div>
            <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-slate-500" />
          </motion.button>
        ))}
      </div>

      <BottomSheet open={sheet === 'projects'} onClose={() => setSheet(null)} title="Ringkasan Proyek" height="85vh">
        {selectedProject && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-500">Pilih proyek</label>
            <select
              value={selectedProject.id}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl text-sm font-medium"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <MetricMiniCard label="Progress" value={`${selectedProject.progress_percentage.toFixed(0)}%`} sub={`planned ${selectedProject.planned_progress}%`} tone={selectedProject.progress_percentage >= selectedProject.planned_progress ? 'success' : 'warning'} />
              <MetricMiniCard label="Keuangan" value={`${Math.round(budgetPct)}%`} sub={formatRupiah(selectedProject.spent_amount)} tone="primary" />
              <MetricMiniCard label="Deadline" value={daysUntil(selectedProject.end_date) > 0 ? `${daysUntil(selectedProject.end_date)} hari` : 'Lewat'} sub={HEALTH_CONFIG[selectedProject.health_status]?.label} />
              <MetricMiniCard label="Notif" value={String(projectRecs.length)} sub="rekomendasi AI" tone={projectRecs.length ? 'warning' : 'default'} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2">Progress keseluruhan</div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${selectedProject.progress_percentage}%` }} />
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-dashed border-emerald-200">
                <div className="h-full bg-emerald-300/60 rounded-full" style={{ width: `${selectedProject.planned_progress}%` }} />
              </div>
            </div>
            {projectRecs.map((r, i) => (
              <div key={i} className="p-3 bg-amber-50 rounded-xl text-xs border border-amber-100">
                <strong>{r.title}</strong>
                <p className="mt-1 text-amber-900/80">{r.message}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { onOpenProject?.(selectedProject.id); setSheet(null); }} className="flex-1 min-w-[120px] py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold">Buka Proyek</button>
              <button type="button" onClick={() => { setCommandModalOpen(true); setSheet(null); }} className="flex-1 min-w-[120px] py-2.5 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">Catat Biaya</button>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2">Proyek lainnya</div>
              {projects.filter(p => p.id !== selectedProject.id).slice(0, 5).map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedProjectId(p.id)} className="w-full flex items-center gap-2 py-2 text-left text-sm border-b border-slate-50">
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs font-mono text-slate-500">{p.progress_percentage.toFixed(0)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={sheet === 'finance'} onClose={() => setSheet(null)} title="Ringkasan Keuangan" height="85vh">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2 font-mono">
            <div className="flex justify-between"><span>Total budget RAP</span><span>{formatRupiah(stats.totalBudget)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Pemasukan</span><span>{formatRupiah(financeTotals.totalInflow)}</span></div>
            <div className="flex justify-between text-rose-600"><span>Realisasi biaya</span><span>({formatRupiah(financeTotals.totalOutflow)})</span></div>
            <div className="border-t pt-2 flex justify-between font-bold"><span>Net kas</span><span className={financeTotals.netCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatRupiah(financeTotals.netCash)}</span></div>
          </div>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Area type="monotone" dataKey="inflow" stroke="#10b981" fill="#10b98120" />
                <Area type="monotone" dataKey="outflow" stroke="#f43f5e" fill="#f43f5e15" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {byProject.slice(0, 6).map(p => {
              const pct = p.budget ? (p.spent / p.budget) * 100 : 0;
              const received = (p as { received?: number }).received ?? 0;
              return (
                <div key={p.projectId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium truncate">{p.name}</span>
                    <span>{Math.round(pct)}% · +{formatRupiahShort(received)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => { setActiveTab('finance'); setSheet(null); }} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold">Laporan Lengkap</button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'attention'} onClose={() => setSheet(null)} title="Perlu Perhatian" height="85vh">
        {attention.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Tidak ada item yang perlu perhatian saat ini.</p>
        ) : (
          <div className="space-y-4">
            {(['critical', 'high', 'medium'] as const).map(sev => {
              const group = attention.filter(a => a.severity === sev);
              if (!group.length) return null;
              const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : '🟡';
              return (
                <div key={sev}>
                  <div className="text-xs font-bold text-slate-500 mb-2">{icon} {sev.toUpperCase()} ({group.length})</div>
                  {group.map((item, i) => (
                    <div key={i} className="p-4 bg-white border rounded-xl mb-2">
                      <div className="font-semibold text-sm">{item.title}</div>
                      <p className="text-xs text-slate-500 mt-1">{item.message}</p>
                      {item.projectId && (
                        <button type="button" onClick={() => { onOpenProject?.(item.projectId!); setSheet(null); }} className="mt-2 text-xs font-bold text-emerald-600">Lihat Detail →</button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={sheet === 'staff'} onClose={() => setSheet(null)} title="Status Karyawan Hari Ini" height="85vh">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className="grid grid-cols-3 gap-2">
            <MetricMiniCard label="Hadir" value={String(attendance.present)} tone="success" />
            <MetricMiniCard label="Tidak" value={String(Math.max(0, attendance.total - attendance.present))} tone="danger" />
            <MetricMiniCard label="Total" value={String(attendance.total)} />
          </div>
          <button type="button" onClick={() => { setActiveTab('hr'); setSheet(null); }} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold">Buka HR & Karyawan</button>
        </div>
      </BottomSheet>
    </>
  );
}
