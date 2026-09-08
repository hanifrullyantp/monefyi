import { AlertTriangle } from 'lucide-react';
import { formatRupiahCompact, formatRupiahFull } from '../../../lib/estimatorFormat';
import type { EstimationSummary } from '../../../types/estimator';

type Props = {
  summary: EstimationSummary;
};

export default function EstimationDetailSummaryMetrics({ summary }: Props) {
  const profitNegative = summary.totalProfit < 0;

  return (
    <div className="grid grid-cols-2 gap-4 py-3 border-t border-slate-100">
      <div>
        <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">
          Nilai Proyek
        </p>
        <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
          {formatRupiahCompact(summary.grandTotal)}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block tabular-nums">
          {formatRupiahFull(summary.grandTotal)}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide flex items-center gap-1">
          Est. Profit
          {profitNegative && <AlertTriangle className="w-3 h-3 text-red-500" aria-hidden />}
        </p>
        <p
          className={`text-lg font-bold mt-1 tabular-nums ${
            profitNegative ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {formatRupiahCompact(summary.totalProfit)}
        </p>
        <p className={`text-[10px] mt-0.5 hidden sm:block tabular-nums ${
          profitNegative ? 'text-red-400' : 'text-emerald-500'
        }`}>
          {formatRupiahFull(summary.totalProfit)}
        </p>
      </div>
    </div>
  );
}
