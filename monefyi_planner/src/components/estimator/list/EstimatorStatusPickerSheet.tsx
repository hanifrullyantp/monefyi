import { AlertTriangle, Archive, Trash2, Unlink } from 'lucide-react';
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
  onArchive?: () => void;
  onDelete?: () => void;
  onUnlinkProject?: () => void;
  isProjectActive?: boolean;
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
  onArchive,
  onDelete,
  onUnlinkProject,
  isProjectActive = false,
  busy = false,
}: Props) {
  const current = estimation ? normalizeEstimationStatus(estimation.status) : 'wa';
  // Read-only hanya jika status memang converted DAN proyek pasangannya masih aktif di sistem
  const readOnly = estimation ? (isStatusReadOnly(current) && isProjectActive) : true;

  return (
    <BottomSheet open={open} onClose={onClose} title="Ubah Status Estimasi" height="auto">
      <div className="px-4 pb-6 space-y-1">
        {readOnly ? (
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-500">
              Status estimasi ini terhubung dengan proyek aktif. Jika Anda ingin mengubah status atau melepaskan tautan proyek, silakan lepas koneksi proyek terlebih dahulu.
            </p>
            {onUnlinkProject && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onClose();
                  onUnlinkProject();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold transition-colors"
              >
                <Unlink className="w-4 h-4" />
                Lepas Hubungan Proyek & Buka Kunci Status
              </button>
            )}
          </div>
        ) : (
          <>
            {OPTIONS.map(status => {
              const active = current === status;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={busy || active}
                  onClick={() => onPick(status)}
                  className={`w-full min-h-11 text-left px-3 py-2.5 rounded-xl ${
                    active ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  } disabled:opacity-60 transition-colors`}
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
            })}

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
                    <span className="text-sm font-bold block">Arsipkan</span>
                    <span className="text-[11px] text-amber-700/80">
                      Pindahkan estimasi ke tab Arsip (30 hari sebelum dihapus permanen)
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
                    <span className="text-sm font-bold block">Hapus Estimasi</span>
                    <span className="text-[11px] text-rose-600/80">
                      Pindahkan ke arsip &amp; hapus otomatis setelah 30 hari
                    </span>
                  </div>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
