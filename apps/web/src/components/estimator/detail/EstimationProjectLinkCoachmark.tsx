import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';

type Props = {
  userId: string;
};

function storageKey(userId: string): string {
  return `estimator-project-link-tip-dismissed:${userId}`;
}

export default function EstimationProjectLinkCoachmark({ userId }: Props) {
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey(userId)) === 'true');
    } catch {
      setDismissed(false);
    }
  }, [userId]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(userId), 'true');
    } catch {
      /* ignore */
    }
    setDismissed(true);
    setOpen(false);
  };

  if (dismissed) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        aria-label="Tips hubungkan proyek"
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 max-w-[calc(100vw-2rem)] p-3 rounded-xl bg-white text-slate-700 text-xs leading-relaxed shadow-xl border border-slate-200 pointer-events-auto">
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-slate-100 text-slate-400"
            aria-label="Tutup tips"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="pr-6">
            Hubungkan ke proyek (dropdown Proyek di Detail) atau jadikan proyek untuk mencatat pembayaran DP/Termin/Pelunasan.
          </p>
        </div>
      )}
    </div>
  );
}
