import {
  ESTIMATION_STATUS_COLOR,
  ESTIMATION_STATUS_DOT,
  ESTIMATION_STATUS_LABEL,
} from '../../lib/estimatorFormat';
import type { EstimationStatus } from '../../types/estimator';

type Props = {
  status: EstimationStatus | string;
  className?: string;
};

export default function StatusBadge({ status, className = '' }: Props) {
  const label = ESTIMATION_STATUS_LABEL[status] || status;
  const color = ESTIMATION_STATUS_COLOR[status] || ESTIMATION_STATUS_COLOR.wa;
  const dot = ESTIMATION_STATUS_DOT[status] || ESTIMATION_STATUS_DOT.wa;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${color} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
