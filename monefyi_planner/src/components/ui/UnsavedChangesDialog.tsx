import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesDialog({
  open,
  title = 'Perubahan belum disimpan',
  message = 'Ada perubahan yang belum disimpan. Simpan sebelum keluar?',
  saving = false,
  onSave,
  onDiscard,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Tutup"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{message}</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            Buang perubahan
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan & keluar
          </button>
        </div>
      </div>
    </div>
  );
}
