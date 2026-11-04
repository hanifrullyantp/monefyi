import BottomSheet from '../../ui/BottomSheet';
import {
  ESTIMATION_STATUS_DESCRIPTION,
  ESTIMATION_WORKFLOW_STATUSES,
  isStatusReadOnly,
  normalizeEstimationStatus,
} from '../../../lib/estimationStatus';
import { ESTIMATION_STATUS_DOT, ESTIMATION_STATUS_LABEL } from '../../../lib/estimatorFormat';
import type { Estimation, EstimationWorkflowStatus } from '../../../types/estimator';

type Props = {
  open: boolean;
  estimation: Estimation | null;
  onClose: () => void;
  onPick: (status: EstimationWorkflowStatus | 'rejected') => void;
  busy?: boolean;
};

const OPTIONS: Array<EstimationWorkflowStatus | 'rejected'> = [
  ...ESTIMATION_WORKFLOW_STATUSES,
  'rejected',
];

export default function EstimatorStatusPickerSheet({
  open,
  estimation,
  onClose,
  onPick,
  busy = false,
}: Props) {
  const current = estimation ? normalizeEstimationStatus(estimation.status) : 'wa';
  const readOnly = estimation ? isStatusReadOnly(current) : true;

  return (
    <BottomSheet open={open} onClose={onClose} title="Ubah status" height="auto">
      <div className="px-4 pb-6 space-y-1">
        {readOnly ? (
          <p className="text-sm text-slate-500 py-4">Status estimasi ini tidak bisa diubah.</p>
        ) : (
          OPTIONS.map(status => {
            const active = current === status;
            return (
              <button
                key={status}
                type="button"
                disabled={busy || active}
                onClick={() => onPick(status)}
                className={`w-full min-h-11 text-left px-3 py-2.5 rounded-xl ${
                  active ? 'bg-emerald-50' : 'hover:bg-slate-50'
                } disabled:opacity-60`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${ESTIMATION_STATUS_DOT[status]}`} aria-hidden />
                  <span className="text-sm font-semibold text-slate-800">
                    {ESTIMATION_STATUS_LABEL[status]}
                    {active && <span className="text-[10px] font-medium text-emerald-600 ml-1">(aktif)</span>}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 pl-4">
                  {ESTIMATION_STATUS_DESCRIPTION[status]}
                </p>
              </button>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
}
