import { ExternalLink, Save, Settings2 } from 'lucide-react';

interface LandingAdminBarProps {
  dirty: boolean;
  saving: boolean;
  onOpenSettings: () => void;
  onSave: () => void;
  onExit: () => void;
}

export default function LandingAdminBar({
  dirty,
  saving,
  onOpenSettings,
  onSave,
  onExit,
}: LandingAdminBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl text-white text-sm max-w-[95vw]">
      <span className="font-semibold text-emerald-300 whitespace-nowrap">Mode edit landing</span>
      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600"
      >
        <Settings2 className="w-4 h-4" />
        Pengaturan
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 font-semibold"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Menyimpan…' : 'Simpan'}
      </button>
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-white"
        title="Pratinjau publik"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
      <button
        type="button"
        onClick={onExit}
        className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
      >
        Keluar edit
      </button>
    </div>
  );
}
