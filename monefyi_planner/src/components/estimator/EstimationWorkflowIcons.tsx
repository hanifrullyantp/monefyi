import type { MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle,
  ClipboardCheck,
  FileText,
  Handshake,
  Hammer,
  Loader2,
  MessageCircle,
  Paintbrush,
} from 'lucide-react';
import {
  ESTIMATION_WORKFLOW_STATUSES,
  normalizeEstimationStatus,
} from '../../lib/estimationStatus';
import type { EstimationWorkflowStatus } from '../../types/estimator';

const WORKFLOW_ICON_CONFIG: Record<
  EstimationWorkflowStatus,
  { icon: LucideIcon; label: string; shortLabel: string }
> = {
  wa: { icon: MessageCircle, label: 'WA', shortLabel: 'WA' },
  survei: { icon: ClipboardCheck, label: 'Survei', shortLabel: 'Sv' },
  penawaran: { icon: FileText, label: 'Penawaran', shortLabel: 'Pn' },
  closing: { icon: Handshake, label: 'Closing', shortLabel: 'Cl' },
  proses: { icon: Hammer, label: 'Proses', shortLabel: 'Pr' },
  finishing: { icon: Paintbrush, label: 'Finishing', shortLabel: 'Fn' },
  selesai: { icon: CheckCircle, label: 'Selesai', shortLabel: 'Sl' },
};

type Props = {
  status: string;
  onSelect: (status: EstimationWorkflowStatus) => void;
  loadingStatus?: EstimationWorkflowStatus | null;
  disabled?: boolean;
  compact?: boolean;
};

export default function EstimationWorkflowIcons({
  status,
  onSelect,
  loadingStatus = null,
  disabled = false,
  compact = false,
}: Props) {
  const current = normalizeEstimationStatus(status);
  const isReadOnly = current === 'converted' || disabled;

  const stop = (e: MouseEvent, next: EstimationWorkflowStatus) => {
    e.stopPropagation();
    if (isReadOnly || next === current || loadingStatus) return;
    onSelect(next);
  };

  return (
    <div
      className={`flex items-center gap-0.5 overflow-x-auto scrollbar-none ${
        compact ? 'max-w-full' : ''
      }`}
      role="group"
      aria-label="Ubah status pipeline"
      onClick={e => e.stopPropagation()}
    >
      {ESTIMATION_WORKFLOW_STATUSES.map(key => {
        const { icon: Icon, label } = WORKFLOW_ICON_CONFIG[key];
        const isActive = current === key;
        const isLoading = loadingStatus === key;

        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            disabled={isReadOnly || Boolean(loadingStatus)}
            onClick={e => stop(e, key)}
            className={`shrink-0 rounded-lg transition-colors ${
              compact ? 'p-1.5' : 'p-2'
            } ${
              isActive
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200/80'
                : isReadOnly
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-100'
            } disabled:opacity-60`}
          >
            {isLoading ? (
              <Loader2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin`} />
            ) : (
              <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { WORKFLOW_ICON_CONFIG };
