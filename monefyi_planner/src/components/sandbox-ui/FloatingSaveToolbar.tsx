import { Undo2, Redo2, Save, X } from 'lucide-react';

type Props = {
  changeCount: number;
  visible: boolean;
  saving?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

/**
 * Floating pill toolbar for undo/redo/save — matches legacy sandbox edit-toolbar.
 */
export default function FloatingSaveToolbar({
  changeCount,
  visible,
  saving = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
  onDiscard,
}: Props) {
  if (!visible || changeCount <= 0) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white rounded-full px-4 py-2.5 shadow-2xl transition-transform duration-300 ease-out ${
        visible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-24'
      }`}
      role="toolbar"
      aria-label="Toolbar simpan perubahan"
    >
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40"
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-white/20" />

      <span className="text-sm font-semibold text-amber-400 whitespace-nowrap">
        {changeCount} perubahan
      </span>

      <div className="w-px h-5 bg-white/20" />

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Menyimpan…' : 'Simpan'}
      </button>

      <button
        type="button"
        onClick={onDiscard}
        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
        title="Buang perubahan"
        aria-label="Buang perubahan"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
