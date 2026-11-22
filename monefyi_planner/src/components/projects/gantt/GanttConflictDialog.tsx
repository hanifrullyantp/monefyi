import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ShieldAlert, X } from 'lucide-react';

export interface GanttConflictDialogProps {
  open: boolean;
  taskName?: string | null;
  message?: string | null;
  localUpdatedAt?: string | null;
  serverUpdatedAt?: string | null;
  busy?: boolean;
  onReloadLatest: () => void | Promise<void>;
  onForceOverwrite: () => void | Promise<void>;
  onCancel?: () => void;
}

function formatConflictTimestamp(iso?: string | null): string | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Optimistic concurrency conflict resolution dialog (F-19 Part 2).
 */
export default function GanttConflictDialog({
  open,
  taskName,
  message,
  localUpdatedAt,
  serverUpdatedAt,
  busy = false,
  onReloadLatest,
  onForceOverwrite,
  onCancel,
}: GanttConflictDialogProps) {
  if (!open) return null;

  const localTime = formatConflictTimestamp(localUpdatedAt);
  const serverTime = formatConflictTimestamp(serverUpdatedAt);

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gantt-conflict-title"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="gantt-conflict-title" className="font-black text-base text-slate-900">
                Konflik Perubahan Data
              </h3>
              {taskName && (
                <p className="text-xs font-semibold text-amber-700 truncate mt-0.5">
                  Pekerjaan: {taskName}
                </p>
              )}
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Tutup dialog konflik"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-3 text-sm text-slate-600">
          <p>
            {message ||
              'Data pekerjaan ini sudah diubah oleh pengguna lain atau di tab lain sejak Anda mulai mengedit.'}
          </p>

          {(localTime || serverTime) && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
              {localTime && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Versi lokal Anda:</span>
                  <span className="font-mono font-semibold text-slate-700">{localTime}</span>
                </div>
              )}
              {serverTime && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Pembaruan terakhir di server:</span>
                  <span className="font-mono font-semibold text-amber-700">{serverTime}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Pilih <strong>Muat Ulang Data Terbaru</strong> untuk mengambil jadwal terkini dari server, atau{' '}
            <strong>Timpa Tetap Simpan</strong> untuk memberlakukan perubahan Anda.
          </p>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onReloadLatest()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            Muat Ulang Data Terbaru
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onForceOverwrite()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-amber-300 bg-amber-50 text-amber-800 rounded-xl text-sm font-bold hover:bg-amber-100 disabled:opacity-60"
          >
            <ShieldAlert className="w-4 h-4" />
            {busy ? 'Menyimpan...' : 'Timpa Tetap Simpan'}
          </button>
          {onCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Tutup — Tinjau Edit Lokal
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
