import { Clock, FileText, FolderOpen } from 'lucide-react';
import { formatRelativeTimeId } from '../../../lib/estimatorFormat';
import { estimationPdfMetaLabel } from '../../../lib/estimatorClientLine';
import type { EstimationStatus } from '../../../types/estimator';

type Props = {
  status: EstimationStatus;
  sentAt?: string | null;
  updatedAt?: string | null;
  itemCount: number;
  marginPct: number;
  linkedProjectName?: string;
};

export default function EstimationDetailMetaRow({
  status,
  sentAt,
  updatedAt,
  itemCount,
  marginPct,
  linkedProjectName,
}: Props) {
  const pdfLabel = estimationPdfMetaLabel(status, sentAt);
  const relativeTime = formatRelativeTimeId(updatedAt);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 border-t border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      <span className="text-slate-500">{itemCount} item</span>
      <span>Margin {marginPct.toFixed(1)}%</span>
      <span className="inline-flex items-center gap-1">
        <FileText className="w-3 h-3 shrink-0" aria-hidden />
        {pdfLabel}
      </span>
      {!isNewPlaceholder(relativeTime) && (
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3 shrink-0" aria-hidden />
          {relativeTime}
        </span>
      )}
      {linkedProjectName && (
        <span className="inline-flex items-center gap-1 text-emerald-600 normal-case font-medium">
          <FolderOpen className="w-3 h-3 shrink-0" aria-hidden />
          {linkedProjectName}
        </span>
      )}
    </div>
  );
}

function isNewPlaceholder(relativeTime: string): boolean {
  return relativeTime === '—';
}
