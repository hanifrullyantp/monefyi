import { formatRupiahFull } from '../../../lib/estimatorFormat';
import type { EstimationSummary } from '../../../types/estimator';

type Props = {
  summary: EstimationSummary;
  variant?: 'light' | 'onDark';
};

export default function EstimationDetailSummaryMetrics({ summary, variant = 'light' }: Props) {
  const onDark = variant === 'onDark';

  return (
    <div className={`py-3 ${onDark ? 'border-t border-white/15' : 'border-t border-slate-100'}`}>
      <p
        className={`text-2xl sm:text-3xl font-black tabular-nums leading-tight ${
          onDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {formatRupiahFull(summary.grandTotal)}
      </p>
    </div>
  );
}
