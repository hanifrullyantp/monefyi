import { CalendarClock, ChevronRight, CircleDollarSign, MessageCircle, TrendingUp, Wallet } from 'lucide-react';
import { formatRupiahFull } from '../../../lib/estimatorFormat';
import type { BillingMilestone, EstimationBillingSnapshot } from '../../../lib/estimationBillingSchedule';

type Props = {
  snapshot: EstimationBillingSnapshot;
  projectName?: string;
  linkedToProject: boolean;
  onMilestoneClick?: (milestone: BillingMilestone) => void;
};

const STATUS_STYLES = {
  paid: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-500/15 text-amber-800 border-amber-200',
  pending: 'bg-slate-100 text-slate-500 border-slate-200',
} as const;

const STATUS_LABELS = {
  paid: 'Lunas',
  partial: 'Sebagian',
  pending: 'Belum',
} as const;

export default function EstimationPaymentDashboard({
  snapshot,
  projectName,
  linkedToProject,
  onMilestoneClick,
}: Props) {
  const { contractTotal, totalReceived, remaining, progressPct, milestones, nextDue } = snapshot;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-900/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.16),transparent_55%)] pointer-events-none" />
      <div className="relative p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100/80">
              Dashboard Pembayaran
            </p>
            {projectName && (
              <p className="text-xs text-emerald-50/90 mt-0.5 truncate">{projectName}</p>
            )}
          </div>
          <div className="shrink-0 w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Wallet className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricTile label="Total Proyek" value={formatRupiahFull(contractTotal)} />
          <MetricTile label="Sudah Dibayar" value={formatRupiahFull(totalReceived)} accent />
          <MetricTile label="Sisa Tagihan" value={formatRupiahFull(remaining)} warn={remaining > 0} />
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-emerald-100/80 mb-1.5">
            <span>Progress pembayaran</span>
            <span className="text-white tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/90 to-emerald-100 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {nextDue && (
          <button
            type="button"
            onClick={() => onMilestoneClick?.(nextDue)}
            className="w-full flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 text-left hover:bg-white/15 transition-colors"
          >
            <CalendarClock className="w-4 h-4 shrink-0 text-emerald-100" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100/80">
                Tagihan berikutnya · tap untuk tagih WA
              </p>
              <p className="text-sm font-bold truncate">
                {nextDue.label} · {formatRupiahFull(nextDue.dueAmount)}
              </p>
            </div>
            <MessageCircle className="w-4 h-4 shrink-0 text-emerald-100" />
          </button>
        )}

        <div className="rounded-xl bg-white/95 backdrop-blur-sm p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Jadwal tagihan
          </div>
          <ul className="space-y-1.5">
            {milestones.map(m => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onMilestoneClick?.(m)}
                  disabled={m.status === 'paid'}
                  className="w-full flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-left hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                >
                  <CircleDollarSign className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{m.label}</p>
                    <p className="text-[10px] text-slate-500 tabular-nums">
                      {formatRupiahFull(m.amount)}
                      {m.paidAmount > 0 && m.status !== 'paid' && (
                        <> · terbayar {formatRupiahFull(m.paidAmount)}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[m.status]}`}
                  >
                    {STATUS_LABELS[m.status]}
                  </span>
                  {m.status !== 'paid' && (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {linkedToProject && (
            <p className="text-[10px] text-emerald-700 leading-relaxed pt-1">
              Terhubung ke proyek — pembayaran tersinkron otomatis.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
      <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-100/75 leading-tight">{label}</p>
      <p
        className={`text-[11px] sm:text-xs font-black tabular-nums mt-1 leading-tight ${
          warn ? 'text-amber-100' : accent ? 'text-white' : 'text-emerald-50'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
