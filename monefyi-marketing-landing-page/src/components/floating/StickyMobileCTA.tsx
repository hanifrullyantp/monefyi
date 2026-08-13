import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { Button } from '../ui/Button';

export function StickyMobileCTA() {
  const scroll = useScrollProgress();
  const visible = scroll > 15 && scroll < 90;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 p-4 flex items-center justify-between shadow-2xl"
        >
          <div>
            <p className="text-white font-extrabold text-lg">Rp 99.000</p>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Sekali Bayar</p>
          </div>
          <Button
            size="md"
            onClick={() => window.location.hash = 'pricing'}
          >
            Beli Sekarang
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
