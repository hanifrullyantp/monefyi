import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2,
  Sparkles, Target, Users, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Project } from '../../../store/appStore';
import type { AnalyzeResult } from '../../../services/analyzeService';
import type { WorkItem } from '../../../services/workItemService';
import type { DailyLog } from '../../../services/dailyLogService';
import type { CostRealization } from '../../../services/costService';
import {
  buildRuleInsights, buildSCurveData, buildUpcomingDeadlines, mergeActivityFeed,
} from '../../../lib/projectCommandUtils';
import { formatRupiah, HEALTH_CONFIG } from '../../../utils/projectUi';
import { formatRelativeTime } from '../../../utils/relativeTime';
import type { CommandTabId } from './types';

type SCurveMode = 'progress' | 'cost' | 'both';

interface TabOverviewProps {
  project: Project;
  health: (typeof HEALTH_CONFIG)[keyof typeof HEALTH_CONFIG];
  daysLeft: number;
  cpi: number;
  spi: number;
  budgetPct: number;
  workItems: WorkItem[];
  logs: DailyLog[];
  costs: CostRealization[];
  analysis: AnalyzeResult | null;
  piutangOutstanding: number;
  onNavigateTab: (tab: CommandTabId) => void;
  onAddCost: () => void;
  onUpdateProgress: () => void;
}

function QuickCard({
  icon: Icon, label, value, sub, onClick, tone = 'neutral',
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const tones = {
    good: 'border-emerald-200 hover:border-emerald-400',
    warn: 'border-amber-200 hover:border-amber-400',
    bad: 'border-rose-200 hover:border-rose-400',
    neutral: 'border-slate-200 hover:border-emerald-300',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white rounded-xl border p-3 text-left w-full transition-all hover:shadow-md hover:scale-[1.02] ${tones[tone]}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-emerald-600" />
        <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-black text-slate-900">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </button>
  );
}

function MiniGanttBar({ wi, projectStart, projectEnd }: {
  wi: WorkItem;
  projectStart: string;
  projectEnd: string;
}) {
  const startMs = new Date(projectStart).getTime();
  const endMs = new Date(projectEnd).getTime();
  const wiStart = new Date(wi.planned_start || projectStart).getTime();
  const wiEnd = new Date(wi.planned_end || projectEnd).getTime();
  const range = endMs - startMs || 1;
  const left = Math.max(0, ((wiStart - startMs) / range) * 100);
  const width = Math.max(4, ((wiEnd - wiStart) / range) * 100);
  const pct = Number(wi.progress_pct) || 0;
  const done = pct >= 100;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-slate-600 shrink-0">{wi.name}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full relative overflow-hidden">
        <div
          className={`absolute top-0 bottom-0 rounded-full ${done ? 'bg-slate-400' : 'bg-emerald-500'}`}
          style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, opacity: 0.35 }}
        />
        <div
          className={`absolute top-0 bottom-0 rounded-full ${done ? 'bg-slate-500' : 'bg-emerald-600'}`}
          style={{ left: `${left}%`, width: `${Math.min(width, 100 - left) * (pct / 100)}%` }}
        />
      </div>
      <span className="w-8 text-right font-bold text-slate-500 shrink-0">{Math.round(pct)}%</span>
    </div>
  );
}

export default function TabOverview({
  project, health, daysLeft, cpi, spi, budgetPct, workItems, logs, costs,
  analysis, piutangOutstanding, onNavigateTab, onAddCost, onUpdateProgress,
}: TabOverviewProps) {
  const [sCurveMode, setSCurveMode] = useState<SCurveMode>('both');
  const chartRef = useRef<HTMLDivElement>(null);

  const sCurveData = useMemo(
    () => buildSCurveData(project, workItems, analysis),
    [project, workItems, analysis],
  );

  const insights = useMemo(
    () => buildRuleInsights(project, budgetPct, daysLeft, analysis, piutangOutstanding),
    [project, budgetPct, daysLeft, analysis, piutangOutstanding],
  );

  const deadlines = useMemo(
    () => buildUpcomingDeadlines(project, workItems),
    [project, workItems],
  );

  const activity = useMemo(
    () => mergeActivityFeed(logs, costs),
    [logs, costs],
  );

  const doneTasks = workItems.filter(w => Number(w.progress_pct) >= 100).length;
  const riskCount = insights.filter(i => i.severity === 'critical' || i.severity === 'warning').length;
  const workers = workItems.reduce((s, w) => s + (Number(w.actual_workers) || Number(w.planned_workers) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Quick summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <QuickCard
          icon={Target}
          label="Tasks"
          value={`${doneTasks}/${workItems.length || '—'}`}
          sub="selesai"
          onClick={() => onNavigateTab('planning')}
          tone={doneTasks === workItems.length && workItems.length > 0 ? 'good' : 'neutral'}
        />
        <QuickCard
          icon={Wallet}
          label="Cost Burn"
          value={`${Math.round(budgetPct)}%`}
          sub={budgetPct > project.progress_percentage + 10 ? 'Over burn' : 'Terkendali'}
          onClick={() => onNavigateTab('keuangan')}
          tone={budgetPct > 90 ? 'bad' : budgetPct > 70 ? 'warn' : 'good'}
        />
        <QuickCard
          icon={Users}
          label="Team"
          value={workers > 0 ? `${workers} org` : '—'}
          sub="tenaga kerja"
          onClick={() => onNavigateTab('bahan')}
        />
        <QuickCard
          icon={AlertTriangle}
          label="Risk"
          value={String(riskCount)}
          sub="issues terdeteksi"
          tone={riskCount > 0 ? 'warn' : 'good'}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Hero S-curve */}
        <div ref={chartRef} className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-emerald-600" /> Kurva S
            </h3>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              {(['progress', 'cost', 'both'] as SCurveMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSCurveMode(m)}
                  className={`px-2.5 py-1 rounded-md capitalize ${sCurveMode === m ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
                >
                  {m === 'both' ? 'Keduanya' : m === 'progress' ? 'Progress' : 'Biaya'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={sCurveData}>
              <defs>
                <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name === 'planned' ? 'Rencana' : 'Realisasi']}
              />
              <ReferenceLine x={sCurveData[Math.floor(sCurveData.length * 0.7)]?.week} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Hari ini', fontSize: 10, fill: '#ef4444' }} />
              {(sCurveMode === 'progress' || sCurveMode === 'both') && (
                <Area type="monotone" dataKey="planned" name="planned" stroke="#059669" fill="url(#planGrad)" strokeDasharray="5 5" strokeWidth={2} />
              )}
              {(sCurveMode === 'progress' || sCurveMode === 'both') && (
                <Area type="monotone" dataKey="actual" name="actual" stroke="#10b981" fill="url(#actGrad)" strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">CPI</span>
              <div className="font-bold font-mono">{cpi.toFixed(2)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">SPI</span>
              <div className="font-bold font-mono">{spi.toFixed(2)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">Health</span>
              <div className={`font-bold ${health.color}`}>{health.label}</div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Insights */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 p-4 shadow-sm">
            <h3 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Insights
            </h3>
            <div className="space-y-2">
              {insights.slice(0, 4).map(ins => (
                <button
                  key={ins.id}
                  type="button"
                  onClick={() => ins.tab && onNavigateTab(ins.tab as CommandTabId)}
                  className="w-full text-left p-3 bg-white/70 backdrop-blur rounded-xl text-xs border border-amber-100 hover:border-emerald-300 transition-colors"
                >
                  <div className="font-bold text-amber-950">{ins.icon} {ins.title}</div>
                  <p className="mt-1 text-amber-900/80">{ins.message}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-800">
              <Activity className="w-4 h-4 text-emerald-600" /> Log Terbaru
            </h3>
            {activity.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada aktivitas.</p>
            ) : (
              <ul className="space-y-2.5">
                {activity.map(entry => (
                  <li key={entry.id} className="flex gap-2 text-xs">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 text-[10px]">
                      {entry.kind === 'finance' ? '💰' : '📋'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-700 line-clamp-2">{entry.text}</p>
                      <p className="text-slate-400 mt-0.5">{formatRelativeTime(entry.time)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upcoming deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-3 text-slate-800">Upcoming Deadline</h3>
            <ul className="space-y-2">
              {deadlines.map(d => (
                <li key={d.id} className="flex items-center justify-between text-xs gap-2">
                  <span className="truncate text-slate-700">{d.label}</span>
                  <span className={`shrink-0 font-bold px-2 py-0.5 rounded-full ${
                    d.severity === 'overdue' ? 'bg-rose-100 text-rose-700'
                      : d.severity === 'urgent' ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}hr lewat` : d.daysLeft === 0 ? 'Hari ini' : `${d.daysLeft} hr lagi`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Mini Gantt */}
      {workItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-800">Mini Gantt — Task Utama</h3>
            <button
              type="button"
              onClick={() => onNavigateTab('planning')}
              className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
            >
              Lihat lengkap <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {workItems.slice(0, 6).map(wi => (
              <MiniGanttBar key={wi.id} wi={wi} projectStart={project.start_date} projectEnd={project.end_date} />
            ))}
          </div>
        </motion.div>
      )}

      {!workItems.length && !costs.length && (
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 mb-1">Mulai isi Command Center</h3>
          <p className="text-sm text-slate-500 mb-4">Tambahkan RAP, jadwal, dan biaya untuk monitoring penuh.</p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={onAddCost} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">+ Tambah Biaya</button>
            <button type="button" onClick={onUpdateProgress} className="px-4 py-2 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold">Update Progress</button>
          </div>
        </div>
      )}
    </div>
  );
}
