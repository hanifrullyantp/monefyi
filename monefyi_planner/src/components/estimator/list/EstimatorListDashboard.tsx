import { AlertCircle, ChevronRight, Plus } from 'lucide-react';
import {
  formatDashboardValue,
  type DashboardListFilter,
  type EstimatorDashboardStats,
} from '../../../lib/estimatorListDashboard';
import { ESTIMATOR_RECENCY_THRESHOLDS } from '../../../lib/estimatorListThresholds';

type Props = {
  stats: EstimatorDashboardStats;
  activeFilter: DashboardListFilter;
  onToggleFilter: (filter: Exclude<DashboardListFilter, 'all'>) => void;
  onCreate: () => void;
};

const CARD_SHADOW = {
  green: '0 10px 28px rgba(6, 78, 59, 0.22)',
  blue: '0 10px 24px rgba(30, 58, 138, 0.2)',
  purple: '0 10px 24px rgba(76, 29, 149, 0.2)',
};

export default function EstimatorListDashboard({
  stats,
  activeFilter,
  onToggleFilter,
  onCreate,
}: Props) {
  const progressPct = Math.min(100, Math.round(stats.newRatio * 100));
  const staleActive = activeFilter === 'stale';

  return (
    <div className="px-4 space-y-3">
      <section
        className="relative overflow-hidden rounded-[20px] px-5 py-5 text-white"
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #047857 52%, #059669 100%)',
          boxShadow: CARD_SHADOW.green,
        }}
      >
        <DecorCircles />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.08em] text-emerald-100/90 uppercase">
              Estimasi baru · {ESTIMATOR_RECENCY_THRESHOLDS.newWindowDays} hari
            </p>
            <div className="mt-2 flex items-end gap-2 flex-wrap">
              <span className="text-5xl font-black leading-none tabular-nums">
                {stats.newInWindow}
              </span>
              <span className="pb-1 text-sm font-medium text-emerald-50/90">
                dari {stats.totalOpen} total
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-full bg-white text-emerald-800 text-sm font-bold shadow-sm active:scale-95 transition-transform"
            aria-label="Buat estimasi baru"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Baru
          </button>
        </div>
        <div className="relative mt-5 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <DashboardStatCard
          label="Active"
          count={stats.activeCount}
          valueLabel={formatDashboardValue(stats.activeValue)}
          pressed={activeFilter === 'active'}
          onClick={() => onToggleFilter('active')}
          gradient="linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 55%, #2563EB 100%)"
          shadow={CARD_SHADOW.blue}
        />
        <DashboardStatCard
          label="Leads"
          count={stats.leadCount}
          valueLabel={formatDashboardValue(stats.leadValue)}
          pressed={activeFilter === 'lead'}
          onClick={() => onToggleFilter('lead')}
          gradient="linear-gradient(135deg, #4C1D95 0%, #7C3AED 55%, #A21CAF 100%)"
          shadow={CARD_SHADOW.purple}
        />
      </div>

      {stats.staleCount > 0 && (
        <div className="flex items-center gap-3 min-h-11 pl-3 pr-1.5 py-1 rounded-full bg-white border border-rose-100">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" aria-hidden />
          <p className="flex-1 min-w-0 text-xs font-medium text-rose-800 leading-snug">
            {stats.staleCount} estimasi mandek lebih dari {ESTIMATOR_RECENCY_THRESHOLDS.staleDays} hari
          </p>
          <button
            type="button"
            onClick={() => onToggleFilter('stale')}
            aria-pressed={staleActive}
            className={`shrink-0 inline-flex items-center justify-center min-h-11 px-4 rounded-full text-sm font-bold text-white active:scale-95 transition-transform ${
              staleActive ? 'bg-rose-800 ring-2 ring-rose-300' : 'bg-rose-600'
            }`}
          >
            Rapikan
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardStatCard({
  label,
  count,
  valueLabel,
  pressed,
  onClick,
  gradient,
  shadow,
}: {
  label: string;
  count: number;
  valueLabel: string;
  pressed: boolean;
  onClick: () => void;
  gradient: string;
  shadow: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={`Filter ${label}, ${count} project`}
      className={`relative overflow-hidden rounded-[20px] px-4 py-4 text-left text-white min-h-[116px] active:scale-[0.98] transition-transform ${
        pressed ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-[#F4F7F5]' : ''
      }`}
      style={{ background: gradient, boxShadow: shadow }}
    >
      <DecorCircles />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-white/80">{label}</p>
        <ChevronRight className="w-4 h-4 text-white/80" aria-hidden />
      </div>
      <p className="relative mt-2 text-3xl font-black leading-none tabular-nums">{count}</p>
      <p className="relative mt-1 text-xs font-medium text-white/85">project</p>
      <p className="relative mt-3 text-sm font-semibold tabular-nums">{valueLabel}</p>
    </button>
  );
}

function DecorCircles() {
  return (
    <>
      <span className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -left-8 -bottom-10 h-32 w-32 rounded-full bg-white/[0.07]" />
    </>
  );
}
