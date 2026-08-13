import React from 'react';
import { useExitIntent } from '../../hooks/useExitIntent';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Download, Sparkles } from 'lucide-react';

import { checkoutUrls } from '../../data/checkout-urls';

export function ExitIntentModal() {
  const { triggered, dismiss } = useExitIntent();

  const handleDownload = () => {
    dismiss();
    window.location.href = checkoutUrls.app;
  };

  return (
    <Modal open={triggered} onClose={dismiss} maxWidth="max-w-md">
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-green-500">
           <Download size={32} />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-4 leading-tight">
           Download Gratis Monefyi Sekarang!
        </h2>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Mulai melek finansial dibantu <span className="text-green-400 font-bold inline-flex items-center gap-1"><Sparkles size={12}/> AI</span> memahami dan memberi saran langsung agar kehidupanmu semakin membaik.
        </p>

        <div className="space-y-3">
          <Button
            fullWidth
            size="lg"
            className="h-14 font-bold"
            onClick={handleDownload}
          >
            Download sekarang — Gratis
          </Button>
          <button
            onClick={dismiss}
            className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Nanti saja
          </button>
        </div>
      </div>
    </Modal>
  );
}
