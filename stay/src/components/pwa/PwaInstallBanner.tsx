import { Download, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import PwaInstallGuideSheet from './PwaInstallGuideSheet';
import { cn } from '../../utils/cn';

export default function PwaInstallBanner() {
  const {
    visible,
    installMode,
    subtitle,
    showInstallButton,
    guideOpen,
    setGuideOpen,
    handleInstall,
    handleGuide,
    handleDismiss,
  } = usePwaInstall();

  if (!visible) {
    return (
      <PwaInstallGuideSheet
        open={guideOpen}
        mode={installMode}
        onClose={() => setGuideOpen(false)}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-x-3 z-[90] mx-auto max-w-lg',
          'bottom-[4.5rem] lg:bottom-4',
          'rounded-2xl border border-emerald-200 bg-white p-3 shadow-lg shadow-emerald-100/50',
          'dark:border-emerald-900 dark:bg-slate-900 dark:shadow-black/30'
        )}
        role="region"
        aria-label="Pasang aplikasi STAY"
        data-testid="pwa-install-banner"
      >
        <div className="flex items-center gap-3">
          <img
            src="/stay/icons/icon-192.png"
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl"
            width={44}
            height={44}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900 dark:text-white">Install STAY</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {showInstallButton && (
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
            )}
            <button
              type="button"
              onClick={handleGuide}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Cara
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Tutup banner install"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Setelah install,{' '}
          <Link to="/settings/frontdesk-preferences" className="font-semibold text-emerald-600 hover:underline">
            aktifkan notifikasi
          </Link>{' '}
          di Preferensi Front Desk
        </p>
      </div>

      <PwaInstallGuideSheet
        open={guideOpen}
        mode={installMode}
        onClose={() => setGuideOpen(false)}
      />
    </>
  );
}
