import { X } from 'lucide-react';
import { getInstallGuideContent, type InstallMode } from '../../services/pwa/installPrompt';
import { cn } from '../../utils/cn';

interface PwaInstallGuideSheetProps {
  open: boolean;
  mode?: InstallMode;
  onClose: () => void;
}

export default function PwaInstallGuideSheet({ open, mode, onClose }: PwaInstallGuideSheetProps) {
  if (!open) return null;

  const content = getInstallGuideContent(mode);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
        className={cn(
          'w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl',
          'dark:border-slate-700 dark:bg-slate-900',
          'animate-in slide-in-from-bottom-4 duration-200'
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{content.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-slate-700"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          {content.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600"
        >
          {content.cta || 'Mengerti'}
        </button>
      </div>
    </div>
  );
}
