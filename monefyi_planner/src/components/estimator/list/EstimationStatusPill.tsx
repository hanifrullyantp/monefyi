import { ESTIMATION_STATUS_COLOR, ESTIMATION_STATUS_LABEL } from '../../../lib/estimatorFormat';
import type { EstimationStatus } from '../../../types/estimator';

type Props = {
  status: EstimationStatus;
  compact?: boolean;
};

export default function EstimationStatusPill({ status, compact = false }: Props) {
  const label = ESTIMATION_STATUS_LABEL[status] || status;
  const color = ESTIMATION_STATUS_COLOR[status] || 'bg-slate-100 text-slate-700';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md ${color} ${
        compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
    >
      {label}
    </span>
  );
}
