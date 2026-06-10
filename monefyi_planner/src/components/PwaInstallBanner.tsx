import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import {
  isStandalonePwa,
  listenForInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../lib/pwa';

const DISMISS_KEY = 'monefyi_planner_pwa_install_dismissed';

export default function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalonePwa() || localStorage.getItem(DISMISS_KEY) === '1') return;
    return listenForInstallPrompt((p) => {
      setPrompt(p);
      setHidden(false);
    });
  }, []);

  if (hidden || !prompt) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
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
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-4 flex items-start gap-3 border border-emerald-500/30">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Install Monefyi Planner</p>
          <p className="text-xs text-slate-300 mt-0.5">Akses cepat dari home screen, seperti app native.</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={install}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold"
            >
              Install
            </button>
            <button type="button" onClick={dismiss} className="px-3 py-1.5 text-xs text-slate-400">
              Nanti
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Tutup" className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
