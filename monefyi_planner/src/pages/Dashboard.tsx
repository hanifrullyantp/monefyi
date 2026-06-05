import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, ChevronRight, Sparkles, Activity, Calendar,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getProjectStats } from '../services/projectService';
import { aggregateNetCashflow } from '../services/projectFinanceService';
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
  const [cashflowData, setCashflowData] = useState<{ date: string; inflow: number; outflow: number; net: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<Array<{ description: string; date: string }>>([]);
  const [recommendations, setRecommendations] = useState<AnalyzeResult['recommendations']>([]);
  const [stats, setStats] = useState({ atRisk: 0, avgProgress: 0 });

  useEffect(() => {
    if (!tenant?.id) return;
    getProjectStats(tenant.id).then(s => setStats({ atRisk: s.atRisk, avgProgress: s.avgProgress })).catch(console.error);
    aggregateNetCashflow(tenant.id, 30).then(setCashflowData).catch(console.error);
    loadRecentLogs(tenant.id).then(logs =>
      setRecentLogs(logs.map(l => ({ description: l.description, date: l.date }))),
    ).catch(console.error);
    const firstActive = projects.find(p => p.status === 'active') || projects[0];
    if (firstActive) {
      analyzeProject(firstActive.id).then(r => {
        if (r?.recommendations) setRecommendations(r.recommendations.slice(0, 3));
      }).catch(console.error);
    }
  }, [tenant?.id, projects.length]);

  const onTrack = projects.filter(p => p.health_status === 'on_track').length;
  const atRisk = projects.filter(p => p.health_status === 'at_risk').length;
  const behind = projects.filter(p => p.health_status === 'behind').length;
  const ahead = projects.filter(p => p.health_status === 'ahead').length;

  const goAtRiskProjects = () => {
    setProjectsListFilter('at_risk');
    setActiveTab('projects');
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            {stats.avgProgress > 0 && <span className="text-slate-400"> · Rata-rata progress {Math.round(stats.avgProgress)}%</span>}
          </p>
        </div>
        {stats.atRisk > 0 && (
          <button
            type="button"
            onClick={goAtRiskProjects}
            className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-semibold text-rose-700">{stats.atRisk} alert</span>
          </button>
        )}
      </motion.div>

      <DashboardInteractiveCards onOpenProject={onOpenProject} />

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">On track {onTrack}</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">At risk {atRisk}</span>
        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">Behind {behind}</span>
        {ahead > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Ahead {ahead}</span>
        )}
      </div>

      <DashboardProjectList
        projects={projects}
        onOpenProject={onOpenProject}
        onViewAll={() => setActiveTab('projects')}
        onCreateProject={() => setActiveTab('projects')}
        canCreate={canCreate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-sm">Arus Kas 30 Hari</h2>
            <span className="text-[10px] text-slate-400">jt Rp</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={cashflowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number, n: string) => [`Rp ${v.toFixed(1)} jt`, n === 'inflow' ? 'Masuk' : n === 'outflow' ? 'Keluar' : 'Net']} />
              <Area type="monotone" dataKey="inflow" stroke="#10b981" fill="#10b98118" strokeWidth={2} />
              <Area type="monotone" dataKey="outflow" stroke="#f43f5e" fill="#f43f5e12" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Log Terbaru
            </h2>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{recentLogs.length}</span>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada log</p>
            ) : recentLogs.slice(0, 6).map((log, i) => (
              <div key={i} className="text-xs text-slate-600 py-1.5 border-b border-slate-50 last:border-0 flex justify-between gap-2">
                <span className="truncate">{log.description}</span>
                <span className="text-slate-400 shrink-0">{log.date}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {recommendations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-slate-800 text-sm">Rekomendasi AI</h2>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-xl border p-3 text-sm ${
                  rec.severity === 'critical' ? 'border-rose-200' : rec.severity === 'high' ? 'border-amber-200' : 'border-slate-100'
                }`}
              >
                <button type="button" className="w-full text-left" onClick={() => setExpandedRec(expandedRec === i ? null : i)}>
                  <div className="flex items-start gap-2">
                    <span>{priorityIcon[rec.severity] || '💡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs">{rec.title}</div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{rec.message}</p>
                      {expandedRec === i && rec.action && (
                        <p className="text-xs text-indigo-600 font-medium mt-1">→ {rec.action}</p>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${expandedRec === i ? 'rotate-90' : ''}`} />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
