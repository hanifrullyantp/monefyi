import { Sparkles, TrendingUp } from 'lucide-react';
import type { BudgetAnalysis, BudgetConfidence, BudgetViewMode } from '../../../types/budgetUsaha';
import { formatRupiah } from '../../../utils/projectUi';

type Props = {
  analysis: BudgetAnalysis | null;
  viewMode: BudgetViewMode;
  lastUpdated?: string;
  loading?: boolean;
  onViewModeChange: (mode: BudgetViewMode) => void;
};

function confidenceLabel(c: BudgetConfidence): string {
  return c === 'high' ? 'Tinggi' : c === 'medium' ? 'Sedang' : 'Rendah';
}

function DonutChart({
  segments,
  total,
}: {
  segments: Array<{ color: string; percent: number }>;
  total: number;
}) {
  let offset = 0;
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {segments.map((seg, i) => {
          const dash = (seg.percent / 100) * c;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <div className="text-[10px] text-slate-400 font-medium">Total budget</div>
        <div className="text-sm font-black text-slate-800">{formatRupiah(total)}</div>
      </div>
    </div>
  );
}

export default function BudgetAnalysis({
  analysis,
  viewMode,
  lastUpdated,
  loading,
  onViewModeChange,
}: Props) {
  if (!analysis && loading) {
    return (
      <div className="animate-pulse space-y-4 p-8 rounded-2xl bg-slate-100 h-64" />
    );
  }
  if (!analysis) return null;

  const displayProfit =
    viewMode === 'yearly' ? analysis.netProfit : analysis.netProfitMonthly;
  const displayRevenue =
    viewMode === 'yearly' ? analysis.revenue.projected : analysis.revenue.monthlyAverage;
  const profitLabel =
    viewMode === 'yearly' ? 'PROYEKSI LABA BERSIH TAHUNAN' : 'PROYEKSI LABA BERSIH BULANAN';

  const donutSegments = analysis.breakdown
    .filter(s => s.key !== 'laba' && s.key !== 'pajak')
    .map(s => ({ color: s.color, percent: s.percent }));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-slate-900">Preview Real-time</h2>
          <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400">
              Update: {new Date(lastUpdated).toLocaleTimeString('id-ID')}
            </span>
          )}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
            {(['monthly', 'yearly'] as BudgetViewMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`px-3 py-1.5 ${
                  viewMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
                }`}
              >
                {mode === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6 md:p-10 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
        <div className="text-xs font-bold tracking-widest opacity-90 mb-2">{profitLabel}</div>
        <div className="text-4xl md:text-5xl font-black mb-2">{formatRupiah(displayProfit)}</div>
        <div className="text-sm opacity-90 mb-4">
          Margin {analysis.margin}% · dari revenue {formatRupiah(displayRevenue)}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
            <TrendingUp className="w-3.5 h-3.5" /> Proyeksi aktif
          </span>
          <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
            Confidence: {confidenceLabel(analysis.revenue.confidence)}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="text-sm font-bold text-slate-700 mb-3">Breakdown</div>
        <div className="flex h-4 rounded-full overflow-hidden mb-4">
          {analysis.breakdown.map(seg => (
            <div
              key={seg.key}
              title={`${seg.label} ${seg.percent}%`}
              style={{ width: `${seg.percent}%`, backgroundColor: seg.color }}
              className="min-w-[2px] transition-all"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {analysis.breakdown.map(seg => (
            <div key={seg.key} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-slate-600 truncate">{seg.label}</span>
              <span className="font-bold text-slate-800 ml-auto">{seg.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col items-center justify-center">
          <DonutChart segments={donutSegments} total={analysis.totalCostMonthly} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Break Even Point',
              value: `${formatRupiah(analysis.breakEvenPoint)}${viewMode === 'monthly' ? '/bln' : '/thn'}`,
            },
            {
              label: 'Runway Kas Cadangan',
              value: `${analysis.cashRunwayMonths} bulan`,
            },
            {
              label: 'ROI Proyeksi Tahunan',
              value: `${analysis.roiProjected}%`,
              green: true,
            },
            {
              label: 'Cash Flow Positif',
              value: analysis.cashFlowPositive
                ? `Ya, dari bulan ${analysis.positiveFromMonth}`
                : 'Belum',
              green: analysis.cashFlowPositive,
            },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="text-[11px] font-medium text-slate-500 mb-1">{card.label}</div>
              <div
                className={`text-lg font-black ${
                  card.green ? 'text-emerald-600' : 'text-slate-900'
                }`}
              >
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
