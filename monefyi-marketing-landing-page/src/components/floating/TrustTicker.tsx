import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const MESSAGES = [
  { name: 'Fajar', action: 'lunasi cicilan HP', time: '8 mnt' },
  { name: 'Rina', action: 'gabung dari Jakarta', time: '15 mnt' },
  { name: 'Ahmad', action: 'upgrade Pro+', time: '23 mnt' },
  { name: 'Sari', action: 'capai goal Dana Darurat', time: '45 mnt' },
  { name: 'Budi', action: 'hemat Rp 500rb', time: '1 jam' },
];

export function TrustTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const msg = MESSAGES[index];

  return (
    <div className="fixed bottom-6 left-6 z-50 hidden md:block">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-xl flex items-center gap-3 min-w-[220px]"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {msg.name[0]}
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-xs text-white leading-tight">
              <span className="font-bold">{msg.name}</span> {msg.action}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{msg.time} lalu</p>
          </div>
          <button onClick={() => setVisible(false)} className="text-slate-500 hover:text-white flex-shrink-0">
            <X size={14} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
