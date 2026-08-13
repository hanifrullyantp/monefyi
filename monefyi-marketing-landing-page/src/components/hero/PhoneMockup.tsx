import React from 'react';
import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';
import { ScreenRotator, useScreenRotator } from './ScreenRotator';
import { EditablePhoneScreen } from '../admin/EditablePhoneScreen';

export function PhoneMockup(): React.ReactElement {
  const { currentIndex, setCurrentIndex, setPaused } = useScreenRotator();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative flex items-center justify-center"
      style={{ paddingBottom: 40, paddingTop: 20 }}
    >
      {/* Cleaner, simpler container */}
      <div className="relative">
        {/* Phone Frame - No 3D tilt for "lighter" feel */}
        <div className="relative mx-auto">
          <PhoneFrame
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="shadow-2xl"
          >
            <ScreenRotator currentIndex={currentIndex} onIndexChange={setCurrentIndex} />
            <EditablePhoneScreen />
          </PhoneFrame>
        </div>

        {/* Simplified Testimonial - Small badge instead of big card */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
           <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Offline Mode</span>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
