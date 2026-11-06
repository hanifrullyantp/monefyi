import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Sparkles,
  Activity,
  Calendar,
  X,
  Plus,
} from 'lucide-react';
import { useAppStore, type Project } from '../store/appStore';
import { getProjectStats } from '../services/projectService';
import { aggregateNetCashflow } from '../services/projectFinanceService';
import DashboardInteractiveCards from '../components/dashboard/DashboardInteractiveCards';
import AgentHomePanel from '../components/dashboard/AgentHomePanel';
import DashboardProjectList from '../components/dashboard/DashboardProjectList';
import { loadRecentLogs } from '../services/dailyLogService';
import { analyzeProject, type AnalyzeResult } from '../services/analyzeService';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  GradientStatCard,
  HealthChips,
  ToolRow,
  ListCard,
  HealthPill,
  StatusPill,
} from '../components/common';
import type { HealthFilterType } from '../components/common/HealthChips';
import { formatRupiah, STATUS_LABEL } from '../utils/projectUi';
import ProjectTransactionModals, { type ModalKind } from '../components/projects/v2/ProjectTransactionModals';
import { PROJECT_THRESHOLDS } from '../lib/projectThresholds';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function formatCompact(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(0)}rb`;
  return String(num);
}

export default function Dashboard({
  onOpenProject,
}: {
  onOpenProject?: (id: string) => void;
}) {
  const { user, projects, tenant, setActiveTab, setProjectsListFilter } = useAppStore();
  const canCreate = user?.role === 'owner' || user?.role === 'manager';

  const [cashflowData, setCashflowData] = useState<
    { date: string; inflow: number; outflow: number; net: number }[]
  >([]);
  const [recentLogs, setRecentLogs] = useState<Array<{ description: string; date: string }>>([]);
  const [recommendations, setRecommendations] = useState<AnalyzeResult['recommendations']>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [stats, setStats] = useState({ atRisk: 0, avgProgress: 0 });

  // Mobile list interactive state
  const [healthFilter, setHealthFilter] = useState<HealthFilterType>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [txModal, setTxModal] = useState<{
    open: boolean;
    kind: ModalKind;
    project: Project | null;
  }>({ open: false, kind: null, project: null });

  // Quick Daily Log Simple Modal
  const [logModalProj, setLogModalProj] = useState<Project | null>(null);
  const [logText, setLogText] = useState('');

  const firstActive = projects.find(p => p.status === 'active') || projects[0];

  useEffect(() => {
    if (!tenant?.id) return;
    getProjectStats(tenant.id)
      .then(s => setStats({ atRisk: s.atRisk, avgProgress: s.avgProgress }))
      .catch(console.error);
    aggregateNetCashflow(tenant.id, 30).then(setCashflowData).catch(console.error);
    loadRecentLogs(tenant.id)
      .then(logs => setRecentLogs(logs.map(l => ({ description: l.description, date: l.date }))))
      .catch(console.error);
  }, [tenant?.id, projects.length]);

  const handleLoadAiRecommendations = async () => {
    if (!firstActive || aiLoading) return;
    setAiLoading(true);
    try {
      const r = await analyzeProject(firstActive.id);
      if (r?.recommendations) setRecommendations(r.recommendations.slice(0, 3));
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const onTrackCount = projects.filter(p => p.health_status === 'on_track').length;
  const atRiskCount = projects.filter(p => p.health_status === 'at_risk').length;
  const behindCount = projects.filter(p => p.health_status === 'behind').length;
  const aheadCount = projects.filter(p => p.health_status === 'ahead').length;
  const activeProjectsCount = projects.filter(p => p.status === 'active').length;
  const attentionCount = atRiskCount + behindCount;

  // Cashflow totals
  const totalInflow = cashflowData.reduce((acc, c) => acc + (c.inflow || 0), 0) * 1_000_000;
  const totalOutflow = cashflowData.reduce((acc, c) => acc + (c.outflow || 0), 0) * 1_000_000;
  const netCash = totalInflow - totalOutflow;

  // Filtered projects for mobile list
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.status !== 'archived')
      .filter(p => {
        if (healthFilter !== 'all' && p.health_status !== healthFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchClient = p.client_name?.toLowerCase().includes(q);
          const matchCode = p.code?.toLowerCase().includes(q);
          if (!matchName && !matchClient && !matchCode) return false;
        }
        return true;
      });
  }, [projects, healthFilter, search]);

  const displayedProjects = filteredProjects.slice(0, visibleCount);
  const remainingCount = filteredProjects.length - visibleCount;

  const goAtRiskProjects = () => {
    setHealthFilter('at_risk');
  };

  const handleOpenProject = (id: string) => {
    if (onOpenProject) {
      onOpenProject(id);
    } else {
      setActiveTab('projects');
    }
  };

  const handleSaveQuickLog = async () => {
    if (!logModalProj || !logText.trim() || !user || !tenant) return;
    try {
      const { createDailyLog } = await import('../services/dailyLogService');
      await createDailyLog({
        org_id: tenant.id,
        project_id: logModalProj.id,
        user_id: user.id,
        date: new Date().toISOString().slice(0, 10),
        description: logText.trim(),
        work_category: 'general',
      });
      setLogModalProj(null);
      setLogText('');
      // Reload logs
      loadRecentLogs(tenant.id).then(logs =>
        setRecentLogs(logs.map(l => ({ description: l.description, date: l.date }))),
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-full pb-28 md:pb-20">
      {/* ─── MOBILE VIEW (Design Redesign Mobile) ─── */}
      <div className="md:hidden px-4 py-3.5 space-y-3 max-w-[420px] mx-auto">
        {/* Top greeting + Alert button */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#5B6B7A] tracking-[0.05em] uppercase">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
            <h1 className="text-[22px] font-extrabold text-[#0F172A] mt-0.5 leading-tight truncate">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <div className="text-xs text-[#5B6B7A] mt-0.5">
              Rata-rata progress {Math.round(stats.avgProgress)}%
            </div>
          </div>

          {stats.atRisk > 0 && (
            <button
              type="button"
              onClick={goAtRiskProjects}
              aria-label={`${stats.atRisk} alert, tampilkan proyek yang perlu perhatian`}
              className="shrink-0 h-11 px-3.5 rounded-[14px] border border-[#FECDD3] bg-[#FFF1F2] text-[#9F1239] font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
              <span>{stats.atRisk} alert</span>
            </button>
          )}
        </div>

        {/* 4 Gradient Stat Cards (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Proyek */}
          <GradientStatCard
            label="PROYEK"
            value={`${activeProjectsCount} / ${projects.length}`}
            subInfo="aktif dari total"
            variant="green"
            onClick={() => setActiveTab('projects')}
            ariaLabel={`Proyek: ${activeProjectsCount} aktif dari ${projects.length} total`}
          />

          {/* 2. Keuangan */}
          <GradientStatCard
            label="KEUANGAN"
            value={formatCompact(netCash)}
            subInfo={`masuk ${formatCompact(totalInflow)} · keluar ${formatCompact(totalOutflow)}`}
            variant="blue"
            onClick={() => setActiveTab('finance')}
            ariaLabel={`Keuangan: Kas bersih ${formatRupiah(netCash)}`}
          />

          {/* 3. Perhatian */}
          <GradientStatCard
            label="PERHATIAN"
            value={attentionCount}
            subInfo="perlu ditindak"
            variant="orange"
            active={healthFilter === 'at_risk' || healthFilter === 'behind'}
            onClick={() => setHealthFilter(prev => (prev === 'at_risk' ? 'all' : 'at_risk'))}
            ariaLabel={`Perhatian: ${attentionCount} proyek perlu ditindak`}
          />

          {/* 4. Karyawan */}
          <GradientStatCard
            label="KARYAWAN"
            value={`${projects.length > 0 ? 1 : 0} / ${projects.length > 0 ? 12 : 0}`}
            subInfo="hadir hari ini"
            variant="teal"
            onClick={() => setActiveTab('hr')}
            ariaLabel="Karyawan: kehadiran hari ini"
          />
        </div>

        {/* Kartu Agen Hari Ini */}
        <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#6D28D9] tracking-[0.06em]">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            AGEN HARI INI
          </div>
          <div className="text-[13px] font-semibold text-[#0F172A] mt-1.5 leading-snug">
            Laporan pagi: antrean persetujuan dan proyek aktif.
          </div>
          <div className="text-xs text-[#5B6B7A] mt-1">
            {stats.atRisk > 0
              ? `${stats.atRisk} proyek memerlukan perhatian dan konfirmasi status.`
              : 'Semua proyek berjalan sesuai rencana. Antrean persetujuan kosong.'}
          </div>
        </div>

        {/* Health Chips Filter */}
        <HealthChips
          counts={{
            onTrack: onTrackCount,
            atRisk: atRiskCount,
            behind: behindCount,
          }}
          activeFilter={healthFilter}
          onSelectFilter={setHealthFilter}
        />

        {/* Tool Row */}
        <ToolRow
          title={healthFilter !== 'all' ? 'Perlu perhatian' : 'Daftar Proyek'}
          count={filteredProjects.length}
          search={search}
          searchOpen={searchOpen}
          onSearchOpen={() => setSearchOpen(true)}
          onSearchClose={() => {
            setSearchOpen(false);
            setSearch('');
          }}
          onSearchChange={setSearch}
          searchPlaceholder="Cari nama, klien, atau kode..."
          showResetFilter={healthFilter !== 'all' || search.length > 0}
          onResetFilter={() => {
            setHealthFilter('all');
            setSearch('');
          }}
          onViewAll={() => setActiveTab('projects')}
          viewAllLabel="Lihat Semua →"
        />

        {/* Project List with Expandable ListCards */}
        <div className="space-y-2">
          {displayedProjects.length === 0 ? (
            <div className="bg-white border border-[#E5EAE8] rounded-2xl p-6 text-center text-sm text-[#5B6B7A]">
              Tidak ada proyek yang cocok dengan filter.
            </div>
          ) : (
            displayedProjects.map(proj => {
              const budgetPlanned = proj.total_budget_planned || 0;
              const budgetSpent = proj.spent_amount || 0;
              const budgetPct = budgetPlanned > 0 ? (budgetSpent / budgetPlanned) * 100 : 0;
              const isOver = budgetPct > PROJECT_THRESHOLDS.budgetOverPercent;
              const isNear = budgetPct > PROJECT_THRESHOLDS.budgetWarningPercent;

              // Health indicator strip
              const stripColor =
                proj.health_status === 'behind'
                  ? '#EF4444'
                  : proj.health_status === 'at_risk'
                    ? '#F59E0B'
                    : '#10B981';

              const barColor = isOver ? '#EF4444' : isNear ? '#F59E0B' : '#059669';

              return (
                <ListCard
                  key={proj.id}
                  id={proj.id}
                  indicatorColor={stripColor}
                  title={proj.name}
                  subtitle={`${proj.client_name || 'Klien'} · ${proj.location || 'Lokasi'}`}
                  pill={
                    <div className="flex items-center gap-1">
                      <HealthPill status={proj.health_status} />
                    </div>
                  }
                  valueText={formatCompact(budgetPlanned)}
                  progressText={`${Math.round(proj.progress_percentage)}%`}
                  onClick={() => handleOpenProject(proj.id)}
                  metrics={[
                    {
                      label: 'PROGRESS',
                      value: `${Math.round(proj.progress_percentage)}%`,
                    },
                    {
                      label: 'REALISASI',
                      value: formatCompact(budgetSpent),
                    },
                    {
                      label: 'STATUS',
                      value: STATUS_LABEL[proj.status] || proj.status,
                    },
                  ]}
                  progressPercent={budgetPct}
                  progressBarColor={barColor}
                  progressLabel="Budget terpakai"
                  progressDetailText={`${Math.round(budgetPct)}%`}
                  alertNote={
                    proj.health_status === 'at_risk' || proj.health_status === 'behind'
                      ? `Perlu update progres atau review biaya (${PROJECT_THRESHOLDS.freshDays} hari tanpa progres baru)`
                      : undefined
                  }
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenProject(proj.id);
                        }}
                        className="flex-1 h-11 rounded-xl bg-[#059669] text-white font-bold text-xs flex items-center justify-center active:scale-95 transition-transform"
                      >
                        Buka proyek
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setTxModal({ open: true, kind: 'cost', project: proj });
                        }}
                        className="flex-1 h-11 rounded-xl border border-[#D5DDDA] bg-white text-[#0F172A] font-semibold text-xs flex items-center justify-center active:scale-95 transition-transform"
                      >
                        Catat biaya
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setLogModalProj(proj);
                        }}
                        className="flex-1 h-11 rounded-xl border border-[#D5DDDA] bg-white text-[#0F172A] font-semibold text-xs flex items-center justify-center active:scale-95 transition-transform"
                      >
                        Log harian
                      </button>
                    </>
                  }
                />
              );
            })
          )}

          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 5)}
              className="w-full h-11 border-0 bg-transparent text-[#047857] font-bold text-sm flex items-center justify-center active:scale-95 transition-transform"
            >
              Tampilkan {remainingCount} proyek lainnya
            </button>
          )}
        </div>
      </div>

      {/* ─── DESKTOP VIEW (Preserve full graphs & panels on md+) ─── */}
      <div className="hidden md:block p-6 space-y-5 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {getGreeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {stats.avgProgress > 0 && (
                <span className="text-slate-600">
                  {' '}
                  · Rata-rata progress {Math.round(stats.avgProgress)}%
                </span>
              )}
            </p>
          </div>
          {stats.atRisk > 0 && (
            <button
              type="button"
              onClick={() => {
                setProjectsListFilter('at_risk');
                setActiveTab('projects');
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100"
            >
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-semibold text-rose-700">{stats.atRisk} alert</span>
            </button>
          )}
        </motion.div>

        <DashboardInteractiveCards onOpenProject={onOpenProject} />
        {tenant?.id && <AgentHomePanel orgId={tenant.id} />}

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            On track {onTrackCount}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            At risk {atRiskCount}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            Behind {behindCount}
          </span>
          {aheadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Ahead {aheadCount}
            </span>
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
              <span className="text-[10px] text-slate-600">jt Rp</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip
                  formatter={(v: number, n: string) => [
                    `Rp ${v.toFixed(1)} jt`,
                    n === 'inflow' ? 'Masuk' : n === 'outflow' ? 'Keluar' : 'Net',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="#10b981"
                  fill="#10b98118"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  stroke="#f43f5e"
                  fill="#f43f5e12"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Log Terbaru
              </h2>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {recentLogs.length}
              </span>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">Belum ada log</p>
              ) : (
                recentLogs.slice(0, 6).map((log, i) => (
                  <div
                    key={i}
                    className="text-xs text-slate-600 py-1.5 border-b border-slate-50 last:border-0 flex justify-between gap-2"
                  >
                    <span className="truncate">{log.description}</span>
                    <span className="text-slate-600 shrink-0">{log.date}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {firstActive && (
          <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h2 className="font-bold text-slate-800 text-sm">
                  Rekomendasi AI ({firstActive.name})
                </h2>
              </div>
              {recommendations.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadAiRecommendations}
                  disabled={aiLoading}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {aiLoading ? 'Menganalisa...' : 'Jalankan Analisa AI'}
                </button>
              )}
            </div>
            {recommendations.length === 0 ? (
              <p className="text-xs text-slate-500">
                Klik &ldquo;Jalankan Analisa AI&rdquo; untuk mendapatkan rekomendasi efisiensi biaya
                & jadwal pada proyek aktif.
              </p>
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100"
                  >
                    <div className="font-bold text-slate-800">{rec.action}</div>
                    <div className="text-slate-600">{rec.impact}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Quick Cost Realization Modal from ListCard action */}
      {txModal.open && txModal.project && tenant?.id && user?.id && (
        <ProjectTransactionModals
          open={txModal.open}
          kind={txModal.kind}
          onClose={() => setTxModal({ open: false, kind: null, project: null })}
          project={txModal.project}
          orgId={tenant.id}
          userId={user.id}
          canManage={canCreate}
          onUpdated={() => {
            setTxModal({ open: false, kind: null, project: null });
          }}
        />
      )}

      {/* Quick Daily Log Modal from ListCard action */}
      {logModalProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#0F172A]">Log Harian: {logModalProj.name}</h3>
              <button
                type="button"
                onClick={() => setLogModalProj(null)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={logText}
              onChange={e => setLogText(e.target.value)}
              placeholder="Catat aktivitas atau progres hari ini..."
              rows={3}
              className="w-full p-3 rounded-xl border border-[#E5EAE8] text-sm outline-none focus:border-[#059669]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLogModalProj(null)}
                className="flex-1 h-11 rounded-xl border border-[#D5DDDA] font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickLog}
                disabled={!logText.trim()}
                className="flex-1 h-11 rounded-xl bg-[#059669] text-white font-bold text-xs disabled:opacity-50"
              >
                Simpan Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
