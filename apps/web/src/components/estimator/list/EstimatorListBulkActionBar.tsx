import { Archive, Loader2, RefreshCw, X } from 'lucide-react';

type Props = {
  selectedCount: number;
  selectableCount: number;
  busy?: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  onArchive: () => void;
  onChangeStatus: () => void;
};

export default function EstimatorListBulkActionBar({
  selectedCount,
  selectableCount,
  busy = false,
  onCancel,
  onSelectAll,
  onArchive,
  onChangeStatus,
}: Props) {
  const allSelected = selectableCount > 0 && selectedCount >= selectableCount;

  return (
    <div className="fixed left-0 right-0 z-40 bottom-[5.5rem] lg:bottom-4 px-3 pointer-events-none">
      <div
        className="pointer-events-auto max-w-6xl mx-auto rounded-2xl border border-emerald-200 bg-white shadow-xl px-3 py-2.5 flex flex-nowrap items-center gap-2 overflow-x-auto"
        role="toolbar"
        aria-label="Aksi massal estimasi"
      >
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-slate-500 hover:bg-slate-50"
          aria-label="Keluar mode checklist"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold text-slate-800 min-w-[5rem]">
          {selectedCount} dipilih
        </p>
        <button
          type="button"
          onClick={onSelectAll}
          disabled={busy || selectableCount === 0}
          className="min-h-11 px-3 rounded-full text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-45"
        >
          {allSelected ? 'Batal pilih semua' : 'Pilih semua'}
        </button>
        <div className="flex-1 min-w-[0.5rem]" />
        <button
          type="button"
          onClick={onChangeStatus}
          disabled={busy || selectedCount === 0}
          aria-label="Ubah status massal"
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full border border-slate-200 text-slate-800 hover:bg-slate-50 disabled:opacity-45 shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onArchive}
          disabled={busy || selectedCount === 0}
          aria-label="Arsipkan terpilih"
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-45 shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
