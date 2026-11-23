import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ChevronDown, Loader2, Lock } from 'lucide-react';
import {
  ESTIMATION_STATUS_COLOR,
  ESTIMATION_STATUS_DOT,
  ESTIMATION_STATUS_LABEL,
} from '../../lib/estimatorFormat';
import {
  ESTIMATION_STATUS_DESCRIPTION,
  ESTIMATION_WORKFLOW_STATUSES,
  isStatusReadOnly,
  normalizeEstimationStatus,
} from '../../lib/estimationStatus';
import type { EstimationStatus, EstimationWorkflowStatus } from '../../types/estimator';

type Props = {
  status: EstimationStatus | string;
  onStatusChange?: (status: EstimationWorkflowStatus | 'rejected') => void;
  loadingStatus?: EstimationWorkflowStatus | 'rejected' | null;
};

const SELECTABLE_STATUSES: Array<EstimationWorkflowStatus | 'rejected'> = [
  ...ESTIMATION_WORKFLOW_STATUSES,
  'rejected',
];

export default function EstimationCardStatusDropdown({
  status,
  onStatusChange,
  loadingStatus = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const normalized = normalizeEstimationStatus(status);
  const readOnly = isStatusReadOnly(normalized) || !onStatusChange;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const label = ESTIMATION_STATUS_LABEL[normalized] || normalized;
  const color = ESTIMATION_STATUS_COLOR[normalized] || ESTIMATION_STATUS_COLOR.wa;
  const dot = ESTIMATION_STATUS_DOT[normalized] || ESTIMATION_STATUS_DOT.wa;

  if (readOnly) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${color}`}
        onClick={stop}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />
        {label}
        <Lock className="w-3 h-3 opacity-60" aria-hidden />
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative inline-block" onClick={stop}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={Boolean(loadingStatus)}
        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${color} hover:ring-2 hover:ring-offset-1 hover:ring-emerald-200 disabled:opacity-60`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />
        {label}
        <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-40 w-[min(18rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-72 overflow-y-auto"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ubah status</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{ESTIMATION_STATUS_DESCRIPTION[normalized]}</p>
          </div>
          {SELECTABLE_STATUSES.map(key => {
            const isCurrent = normalized === key;
            const isLoading = loadingStatus === key;
            const itemDot = ESTIMATION_STATUS_DOT[key] || ESTIMATION_STATUS_DOT.wa;

            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={isCurrent || Boolean(loadingStatus)}
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) onStatusChange?.(key);
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 disabled:opacity-60 ${
                  isCurrent ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${itemDot}`} aria-hidden />
                  )}
                  <span className={`text-sm font-semibold ${isCurrent ? 'text-emerald-800' : 'text-slate-800'}`}>
                    {ESTIMATION_STATUS_LABEL[key]}
                    {isCurrent && <span className="text-[10px] font-medium text-emerald-600 ml-1">(aktif)</span>}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 pl-4 leading-snug">
                  {ESTIMATION_STATUS_DESCRIPTION[key]}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
