import { Clock, FileText, FolderOpen } from 'lucide-react';
import { formatRelativeTimeId } from '../../../lib/estimatorFormat';
import { estimationPdfMetaLabel } from '../../../lib/estimatorClientLine';
import type { EstimationStatus } from '../../../types/estimator';

type Props = {
  status: EstimationStatus;
  sentAt?: string | null;
  updatedAt?: string | null;
  itemCount: number;
  linkedProjectName?: string;
  variant?: 'light' | 'onDark';
};

export default function EstimationDetailMetaRow({
  status,
  sentAt,
  updatedAt,
  itemCount,
  linkedProjectName,
  variant = 'light',
}: Props) {
  const onDark = variant === 'onDark';
  const pdfLabel = estimationPdfMetaLabel(status, sentAt);
  const relativeTime = formatRelativeTimeId(updatedAt);
  const textClass = onDark ? 'text-emerald-100/80' : 'text-slate-400';
  const itemClass = onDark ? 'text-white/90' : 'text-slate-500';
  const projectClass = onDark ? 'text-emerald-100' : 'text-emerald-600';

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wide ${textClass}`}>
      <span className={itemClass}>{itemCount} item</span>
      <span className="inline-flex items-center gap-1">
        <FileText className="w-3 h-3 shrink-0" aria-hidden />
        {pdfLabel}
      </span>
      {relativeTime !== '—' && (
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3 shrink-0" aria-hidden />
          {relativeTime}
        </span>
      )}
      {linkedProjectName && (
        <span className={`inline-flex items-center gap-1 normal-case font-medium ${projectClass}`}>
          <FolderOpen className="w-3 h-3 shrink-0" aria-hidden />
          {linkedProjectName}
        </span>
      )}
    </div>
  );
}
