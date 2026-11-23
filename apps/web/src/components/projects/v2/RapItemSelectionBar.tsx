import { Pencil, Copy, Trash2, X, CalendarDays } from 'lucide-react';

type Props = {
  count: number;
  canEdit: boolean;
  isLabor?: boolean;
  onEdit: () => void;
  onOpenSchedule?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClear: () => void;
  busy?: boolean;
};

export default function RapItemSelectionBar({
  count, canEdit, isLabor, onEdit, onOpenSchedule, onDuplicate, onDelete, onClear, busy,
}: Props) {
  if (count <= 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl max-w-[calc(100vw-2rem)]"
      role="toolbar"
      aria-label="Aksi item terpilih"
    >
      <span className="text-sm font-bold text-blue-300 whitespace-nowrap px-1">
        {count} terpilih
      </span>
      <div className="w-px h-5 bg-white/20 hidden sm:block" />
      {canEdit && count === 1 && (
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold disabled:opacity-50"
        >
          <Pencil className="w-4 h-4" /> Edit
        </button>
      )}
      {canEdit && count === 1 && isLabor && onOpenSchedule && (
        <button
          type="button"
          onClick={onOpenSchedule}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold disabled:opacity-50"
        >
          <CalendarDays className="w-4 h-4" /> Jadwal
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={onDuplicate}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold disabled:opacity-50"
        >
          <Copy className="w-4 h-4" /> Duplikat
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-sm font-bold disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> Hapus
        </button>
      )}
      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50"
        title="Batal pilih"
        aria-label="Batal pilih"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
