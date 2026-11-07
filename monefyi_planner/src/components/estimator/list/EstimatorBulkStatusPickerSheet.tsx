import { Archive, Trash2 } from 'lucide-react';
import BottomSheet from '../../ui/BottomSheet';
import {
  ESTIMATION_STATUS_DESCRIPTION,
  ESTIMATION_WORKFLOW_STATUSES,
} from '../../../lib/estimationStatus';
import { ESTIMATION_STATUS_DOT, ESTIMATION_STATUS_LABEL } from '../../../lib/estimatorFormat';
import type { EstimationWorkflowStatus } from '../../../types/estimator';

type Props = {
  open: boolean;
  count: number;
  onClose: () => void;
  onPick: (status: EstimationWorkflowStatus | 'rejected') => void;
  onArchive?: () => void;
  onDelete?: () => void;
  busy?: boolean;
};

const OPTIONS: Array<EstimationWorkflowStatus | 'rejected'> = [
  ...ESTIMATION_WORKFLOW_STATUSES,
  'rejected',
];

export default function EstimatorBulkStatusPickerSheet({
  open,
  count,
  onClose,
  onPick,
  onArchive,
  onDelete,
  busy = false,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Ubah status massal" height="auto">
      <p className="px-4 text-xs text-slate-500 -mt-1 mb-2">
        Berlaku untuk {count} estimasi terpilih (kecuali yang sudah jadi proyek).
      </p>
      <div className="px-4 pb-6 space-y-1">
        {OPTIONS.map(status => (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={() => onPick(status)}
            className="w-full min-h-11 text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ESTIMATION_STATUS_DOT[status]}`} aria-hidden />
              <span className="text-sm font-semibold text-slate-800">
                {ESTIMATION_STATUS_LABEL[status]}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 pl-4">
              {ESTIMATION_STATUS_DESCRIPTION[status]}
            </p>
          </button>
        ))}

        <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
          {onArchive && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onClose();
                onArchive();
              }}
              className="w-full min-h-11 text-left px-3 py-2.5 rounded-xl hover:bg-amber-50 text-amber-800 flex items-center gap-2.5 transition-colors"
            >
              <Archive className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-sm font-bold block">Arsipkan Massal</span>
                <span className="text-[11px] text-amber-700/80">
                  Pindahkan {count} estimasi ke tab Arsip (30 hari sebelum dihapus permanen)
                </span>
              </div>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="w-full min-h-11 text-left px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-700 flex items-center gap-2.5 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="text-sm font-bold block">Hapus Massal</span>
                <span className="text-[11px] text-rose-600/80">
                  Pindahkan ke arsip &amp; hapus otomatis setelah 30 hari
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
