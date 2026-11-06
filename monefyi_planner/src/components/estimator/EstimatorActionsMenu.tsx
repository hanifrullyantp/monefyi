import { useEffect, useRef, useState } from 'react';
import { Box, Copy, MoreVertical, Rocket, Trash2 } from 'lucide-react';

type Props = {
  status: string;
  convertedProjectId?: string | null;
  onConvert: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLaunchIntero3D?: () => void;
  isSuperAdmin?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'onDark';
};

export default function EstimatorActionsMenu({
  status,
  convertedProjectId,
  onConvert,
  onDuplicate,
  onDelete,
  onLaunchIntero3D,
  isSuperAdmin = false,
  disabled = false,
  variant = 'default',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isConverted = status === 'converted' || Boolean(convertedProjectId);
  const convertProminent = status === 'closing' || status === 'accepted';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl disabled:opacity-60 ${
          variant === 'onDark'
            ? 'text-white hover:bg-white/15'
            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        aria-label="Menu aksi"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[12rem] bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm"
        >
          {isSuperAdmin && onLaunchIntero3D && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLaunchIntero3D();
              }}
              className="w-full text-left px-3 py-2.5 flex items-center gap-2 font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/80 border-b border-emerald-100 transition-colors"
            >
              <Box className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Generate 3D Intero</span>
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={isConverted}
            title={isConverted ? 'Estimasi sudah menjadi proyek' : undefined}
            onClick={() => {
              setOpen(false);
              if (!isConverted) onConvert();
            }}
            className={`w-full text-left px-3 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              convertProminent
                ? 'font-bold text-emerald-700 hover:bg-emerald-50'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Rocket className="w-4 h-4 shrink-0" />
            Jadikan Proyek
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50"
          >
            <Copy className="w-4 h-4 shrink-0" />
            Duplikat
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}
