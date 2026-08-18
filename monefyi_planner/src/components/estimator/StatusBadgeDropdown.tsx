import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import {
  ESTIMATION_STATUS_COLOR,
  ESTIMATION_STATUS_DOT,
  ESTIMATION_STATUS_LABEL,
} from '../../lib/estimatorFormat';
import { getStatusTransitionActions } from '../../lib/estimationStatus';
import type { EstimationStatus } from '../../types/estimator';

type Props = {
  status: EstimationStatus;
  onTransition: (next: EstimationStatus) => void;
  disabled?: boolean;
  className?: string;
};

export default function StatusBadgeDropdown({
  status,
  onTransition,
  disabled = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const actions = getStatusTransitionActions(status);
  const isReadOnly = status === 'converted' || actions.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const label = ESTIMATION_STATUS_LABEL[status] || status;
  const color = ESTIMATION_STATUS_COLOR[status] || ESTIMATION_STATUS_COLOR.draft;
  const dot = ESTIMATION_STATUS_DOT[status] || ESTIMATION_STATUS_DOT.draft;

  if (isReadOnly) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${color} ${className}`}
        title="Estimasi sudah menjadi proyek"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />
        {label}
        <Lock className="w-3 h-3 opacity-60" aria-hidden />
      </span>
    );
  }

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${color} hover:ring-2 hover:ring-offset-1 hover:ring-slate-200 disabled:opacity-60`}
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
          className="absolute left-0 top-full mt-1 z-30 min-w-[11rem] bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm"
        >
          {actions.map(action => (
            <button
              key={action.status}
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium"
              onClick={() => {
                setOpen(false);
                onTransition(action.status);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
