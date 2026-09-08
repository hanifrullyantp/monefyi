import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import {
  isStandalonePwa,
  listenForInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../lib/pwa';
import { isEstimatorBrandContext } from '../lib/estimatorBrand';
import { EstimatorLogo } from './EstimatorLogo';

const DISMISS_KEY_PLANNER = 'monefyi_planner_pwa_install_dismissed';
const DISMISS_KEY_ESTIMATOR = 'monefyi_estimator_pwa_install_dismissed';

export default function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const isEstimator = isEstimatorBrandContext();
  const dismissKey = isEstimator ? DISMISS_KEY_ESTIMATOR : DISMISS_KEY_PLANNER;

  useEffect(() => {
    if (isStandalonePwa() || localStorage.getItem(dismissKey) === '1') return;
    return listenForInstallPrompt((p) => {
      setPrompt(p);
      setHidden(false);
    });
  }, [dismissKey]);

  if (hidden || !prompt) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey, '1');
    setHidden(true);
  };

  const install = async () => {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') dismiss();
    setPrompt(null);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[60]">
      <div className={`rounded-2xl shadow-xl p-4 flex items-start gap-3 border ${
        isEstimator
          ? 'bg-slate-900 text-white border-[#76b82a]/40'
          : 'bg-slate-900 text-white border-emerald-500/30'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
          isEstimator ? 'bg-white' : 'bg-emerald-600'
        }`}>
          {isEstimator ? (
            <EstimatorLogo className="w-9 h-9 object-contain" />
          ) : (
            <Download className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">
            {isEstimator ? 'Install Monefyi Estimator' : 'Install Monefyi Planner'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEstimator
              ? 'Buka langsung ke Estimator dari home screen.'
              : 'Akses cepat dari home screen, seperti app native.'}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={install}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white ${
                isEstimator ? 'bg-[#76b82a] hover:brightness-110' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              Install
            </button>
            <button type="button" onClick={dismiss} className="px-3 py-1.5 text-xs text-slate-600">
              Nanti
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Tutup" className="text-slate-600 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
