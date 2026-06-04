import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, AlertCircle,
  CheckCircle, BarChart3, ChevronRight,
  Sparkles, Activity, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getProjectStats } from '../services/projectService';
import { aggregateCashflow } from '../services/costService';
import DashboardInteractiveCards from '../components/dashboard/DashboardInteractiveCards';
import DashboardProjectList from '../components/dashboard/DashboardProjectList';
import { loadRecentLogs } from '../services/dailyLogService';
import { analyzeProject } from '../services/analyzeService';
import type { AnalyzeResult } from '../services/analyzeService';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';


const priorityIcon: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

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

export default function Dashboard({ onOpenProject }: { onOpenProject?: (id: string) => void }) {
  const { user, projects, tenant, setActiveTab, setProjectsListFilter } = useAppStore();
  const canCreate = user?.role === 'owner' || user?.role === 'manager';
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [cashflowData, setCashflowData] = useState<{ date: string; amount: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<Array<{ description: string; date: string }>>([]);
  const [recommendations, setRecommendations] = useState<AnalyzeResult['recommendations']>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalBudget: 0,
    totalSpent: 0,
    avgProgress: 0,
    atRisk: 0,
  });

  useEffect(() => {
    if (!tenant?.id) return;
    getProjectStats(tenant.id).then(setStats).catch(console.error);
    aggregateCashflow(tenant.id).then(setCashflowData).catch(console.error);
    loadRecentLogs(tenant.id).then(logs =>
      setRecentLogs(logs.map(l => ({ description: l.description, date: l.date }))),
    ).catch(console.error);
    const firstActive = projects.find(p => p.status === 'active') || projects[0];
    if (firstActive) {
      analyzeProject(firstActive.id).then(r => {
        if (r?.recommendations) setRecommendations(r.recommendations);
      }).catch(console.error);
    }
  }, [tenant?.id, projects.length]);

  const activeProjects = projects.filter(p => p.status === 'active');
  const onTrack = projects.filter(p => p.health_status === 'on_track').length;
  const atRisk = projects.filter(p => p.health_status === 'at_risk').length;
  const behind = projects.filter(p => p.health_status === 'behind').length;
  const todayTodos = recentLogs.slice(0, 5).map((log, i) => ({
    id: String(i),
    title: log.description,
    status: 'pending' as const,
    priority: 'medium' as const,
    due_date: log.date,
  }));

  const monthLabel = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const goAtRiskProjects = () => {
    setProjectsListFilter('at_risk');
    setActiveTab('projects');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">
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
        <button
          type="button"
          onClick={goAtRiskProjects}
          disabled={stats.atRisk === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full disabled:opacity-50 hover:bg-rose-100 transition-colors"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-xs font-semibold text-rose-700">{stats.atRisk} alert</span>
        </button>
      </motion.div>

      {/* Interactive dashboard cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Ringkasan Bisnis</h2>
          <span className="text-xs text-slate-400">{monthLabel}</span>
        </div>
        <DashboardInteractiveCards onOpenProject={onOpenProject} />
      </section>

      <DashboardProjectList
        projects={projects}
        onOpenProject={onOpenProject}
        onViewAll={() => setActiveTab('projects')}
        onCreateProject={() => setActiveTab('projects')}
        canCreate={canCreate}
      />

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
                onClick={() => onOpenProject?.(proj.id)}
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
              <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} fill="url(#expense)" name="Pengeluaran" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-1.5 rounded-full bg-amber-500" /> Pengeluaran 30 hari (jt Rp)
            </div>
          </div>
        </section>

        {/* Today's Agenda */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Log & Aktivitas Terbaru</h2>
            <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {todayTodos.length} entri
            </div>
          </div>
          <div className="space-y-2">
            {todayTodos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Belum ada log harian hari ini</p>
            ) : (
              todayTodos.map((todo) => (
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
            ))
            )}
          </div>
        </section>
      </div>

      {/* AI Recommendations */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-800">AI Recommendations</h2>
          {recommendations.length > 0 && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
              {recommendations.length} rekomendasi
            </span>
          )}
        </div>
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-2xl border border-slate-100 p-6 text-center">
            Buat proyek aktif untuk mendapatkan rekomendasi AI
          </p>
        ) : (
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                rec.severity === 'critical' ? 'border-rose-200' :
                  rec.severity === 'high' ? 'border-amber-200' : 'border-amber-100'
              }`}
            >
              <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedRec(expandedRec === i ? null : i)}
              >
                <span className="text-xl shrink-0">{priorityIcon[rec.severity] || '💡'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{rec.title}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{rec.type}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{rec.message}</p>
                  {expandedRec === i && rec.action && (
                    <p className="text-xs text-indigo-600 font-medium mt-2">→ {rec.action}</p>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expandedRec === i ? 'rotate-90' : ''}`} />
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Aktivitas Terbaru
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {recentLogs.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">Belum ada aktivitas</p>
          ) : (
          recentLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
              <span className="text-xl">📝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{log.description}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{log.date}</span>
            </div>
          ))
          )}
        </div>
      </section>
    </div>
  );
}
