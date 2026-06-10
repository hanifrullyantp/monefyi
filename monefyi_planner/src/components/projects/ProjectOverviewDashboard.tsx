import { motion } from 'framer-motion';
import {
  Activity, ArrowUpRight, BarChart3, DollarSign, Sparkles, Target, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Project } from '../../store/appStore';
import type { AnalyzeResult } from '../../services/analyzeService';
import type { DailyLog } from '../../services/dailyLogService';
import { formatRupiah, HEALTH_CONFIG } from '../../utils/projectUi';
import { formatRelativeTime } from '../../utils/relativeTime';

interface KpiCard {
  key: string;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  icon: typeof Target;
  spark: number[];
}

interface ProjectOverviewDashboardProps {
  project: Project;
  health: (typeof HEALTH_CONFIG)[keyof typeof HEALTH_CONFIG];
  cpi: number;
  spi: number;
  cv: number;
  sv: number;
  budgetPct: number;
  received: number;
  surplus: number;
  sCurveData: { week: string; planned: number; actual: number }[];
  logs: DailyLog[];
  analysis: AnalyzeResult | null;
  onAddCost: () => void;
  onUpdateProgress: () => void;
  onOpenReport: () => void;
}

function toneClasses(tone: KpiCard['tone']) {
  switch (tone) {
    case 'good': return 'from-emerald-500/10 to-emerald-500/5 border-emerald-200/80 text-emerald-700';
    case 'warn': return 'from-amber-500/10 to-amber-500/5 border-amber-200/80 text-amber-700';
    case 'bad': return 'from-rose-500/10 to-rose-500/5 border-rose-200/80 text-rose-700';
    default: return 'from-emerald-500/10 to-emerald-500/5 border-emerald-200/80 text-emerald-700';
  }
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={points}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ProjectOverviewDashboard({
  project,
  health,
  cpi,
  spi,
  cv,
  sv,
  budgetPct,
  received,
  surplus,
  sCurveData,
  logs,
  analysis,
  onAddCost,
  onUpdateProgress,
  onOpenReport,
}: ProjectOverviewDashboardProps) {
  const ac = project.spent_amount;
  const bac = project.total_budget_planned;
  const progress = project.progress_percentage;

  const kpis: KpiCard[] = [
    {
      key: 'progress',
      label: 'Progress',
      value: `${progress.toFixed(0)}%`,
      trend: progress >= 50 ? '▲ On track' : '▼ Perlu dorong',
      trendUp: progress >= 50,
      tone: progress >= 40 ? 'good' : 'warn',
      icon: Target,
      spark: sCurveData.map(d => d.actual),
    },
    {
      key: 'budget',
      label: 'Budget Terpakai',
      value: `${Math.round(budgetPct)}%`,
      trend: budgetPct > progress + 15 ? '▼ Over burn' : '▲ Terkendali',
      trendUp: budgetPct <= progress + 15,
      tone: budgetPct > 90 ? 'bad' : budgetPct > 70 ? 'warn' : 'good',
      icon: Wallet,
      spark: [budgetPct * 0.7, budgetPct * 0.8, budgetPct * 0.9, budgetPct],
    },
    {
      key: 'cpi',
      label: 'CPI',
      value: cpi.toFixed(2),
      trend: cpi >= 1 ? '▲ Efisien' : '▼ Mahal',
      trendUp: cpi >= 1,
      tone: cpi >= 1 ? 'good' : 'bad',
      icon: DollarSign,
      spark: [cpi * 0.9, cpi * 0.95, cpi, cpi],
    },
    {
      key: 'spi',
      label: 'SPI',
      value: spi.toFixed(2),
      trend: spi >= 1 ? '▲ Cepat' : '▼ Tertinggal',
      trendUp: spi >= 1,
      tone: spi >= 1 ? 'good' : 'warn',
      icon: Activity,
      spark: [spi * 0.85, spi * 0.9, spi, spi],
    },
    {
      key: 'received',
      label: 'Diterima',
      value: formatRupiah(received),
      tone: received > 0 ? 'good' : 'neutral',
      icon: TrendingUp,
      spark: [received * 0.5, received * 0.7, received * 0.9, received].map(v => v / 1e6 || 0),
    },
    {
      key: 'surplus',
      label: 'Saldo+',
      value: formatRupiah(surplus),
      tone: surplus >= 0 ? 'good' : 'bad',
      icon: surplus >= 0 ? TrendingUp : TrendingDown,
      spark: [surplus / 1e6],
    },
  ];

  const hasData = bac > 0 || ac > 0 || logs.length > 0;

  return (
    <div className="space-y-4 md:space-y-5">
      {!hasData && (
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-bold text-slate-800 mb-1">Mulai isi proyek ini</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            Tambahkan RAP di tab Planning, catat biaya di Realisasi, lalu pantau KPI di sini.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onAddCost} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">
              + Tambah Biaya
            </button>
            <button type="button" onClick={onUpdateProgress} className="px-4 py-2 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold">
              Update Progress
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl border bg-gradient-to-br p-3 md:p-3.5 shadow-sm hover:shadow-md transition-shadow ${toneClasses(k.tone)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide opacity-80">{k.label}</span>
                <Icon className="w-3.5 h-3.5 opacity-60" />
              </div>
              <div className="text-lg md:text-2xl font-black font-mono text-slate-900 leading-tight">{k.value}</div>
              {k.trend && (
                <div className={`text-[10px] font-semibold mt-0.5 ${k.trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {k.trend}
                </div>
              )}
              <div className="mt-1 opacity-70">
                <MiniSparkline data={k.spark.length ? k.spark : [0]} color={k.trendUp === false ? '#f59e0b' : '#10b981'} />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Tambah Biaya', onClick: onAddCost },
          { label: 'Update Progress', onClick: onUpdateProgress },
          { label: 'Lihat Laporan', onClick: onOpenReport },
        ].map(a => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 shadow-sm"
          >
            {a.label}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        ))}
        <span className={`ml-auto self-center text-xs font-bold px-2.5 py-1 rounded-full ${health.bg} ${health.color} border`}>
          {health.label}
        </span>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-emerald-600" /> Kurva S
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sCurveData}>
              <defs>
                <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip />
              <Area type="monotone" dataKey="planned" name="Rencana" stroke="#059669" fill="url(#plannedGrad)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="actual" name="Aktual" stroke="#10b981" fill="url(#actualGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">BAC</span>
              <div className="font-bold font-mono">{formatRupiah(bac)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">AC · CV {formatRupiah(cv)}</span>
              <div className="font-bold font-mono">{formatRupiah(ac)}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 p-4 shadow-sm">
            <h3 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Insights
            </h3>
            {!analysis?.recommendations?.length ? (
              <p className="text-xs text-amber-800/80 leading-relaxed">
                Tambahkan RAP, jadwal, dan biaya untuk mendapatkan rekomendasi prioritas dari AI.
              </p>
            ) : (
              <div className="space-y-2">
                {analysis.recommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="p-3 bg-white/70 backdrop-blur rounded-xl text-xs text-amber-950 border border-amber-100">
                    <div className="font-bold">{rec.title}</div>
                    <p className="mt-1 opacity-90">{rec.message}</p>
                    {rec.action && (
                      <button type="button" onClick={onOpenReport} className="mt-2 text-emerald-700 font-bold flex items-center gap-1">
                        {rec.action} <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-800">
              <Activity className="w-4 h-4 text-emerald-600" /> Log Terbaru
            </h3>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada aktivitas lapangan.</p>
            ) : (
              <ul className="space-y-3">
                {logs.slice(0, 6).map(log => (
                  <li key={log.id} className="flex gap-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      {(log.description || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700 font-medium line-clamp-2">{log.description}</p>
                      <p className="text-slate-400 mt-0.5">{formatRelativeTime(log.created_at || log.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-slate-600 bg-white rounded-xl p-4 border border-slate-200">{project.description}</p>
      )}
    </div>
  );
}
