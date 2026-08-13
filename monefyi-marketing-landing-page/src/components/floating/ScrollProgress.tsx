import React from 'react';
import { motion } from 'framer-motion';
import { useScrollProgress } from '../../hooks/useScrollProgress';

export function ScrollProgress() {
  const progress = useScrollProgress();
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-[3px] bg-transparent pointer-events-none">
      <motion.div
        className="h-full bg-gradient-to-r from-green-500 to-green-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      />
      {/* If admin mode is active, add offset */}
      <style dangerouslySetInnerHTML={{ __html: `
        [data-admin-active="true"] .fixed-top-progress { top: 40px; }
      `}} />
    </div>
  );
}
