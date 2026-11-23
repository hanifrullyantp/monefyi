import { Archive, Check, X } from 'lucide-react';

type Props = {
  open: boolean;
  count: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Konfirmasi arsip — satu baris, aksi pakai ikon + aria-label. */
export default function EstimatorArchiveConfirmDialog({
  open,
  count,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const label = count === 1 ? 'Arsip 1 estimasi?' : `Arsip ${count} estimasi?`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/45"
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div
        role="dialog"
        aria-labelledby="archive-confirm-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 min-h-[3.25rem]"
      >
        <Archive className="w-5 h-5 text-rose-600 shrink-0" aria-hidden />
        <p
          id="archive-confirm-title"
          className="flex-1 min-w-0 text-sm font-bold text-slate-900 truncate whitespace-nowrap"
        >
          {label}
        </p>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Batal arsip"
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-label="Ya, arsipkan"
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shrink-0"
        >
          <Check className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
