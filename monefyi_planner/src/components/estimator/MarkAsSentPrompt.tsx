import { useEffect } from 'react';
import { Send, X } from 'lucide-react';

type Props = {
  open: boolean;
  onMarkSent: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
};

export default function MarkAsSentPrompt({
  open,
  onMarkSent,
  onDismiss,
  autoDismissMs = 8000,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [open, onDismiss, autoDismissMs]);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-4 flex gap-3 items-start">
        <Send className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">PDF sudah dibagikan</p>
          <p className="text-xs text-slate-300 mt-0.5">Tandai estimasi sebagai Penawaran?</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={onMarkSent}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-xs font-bold"
            >
              Tandai
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
