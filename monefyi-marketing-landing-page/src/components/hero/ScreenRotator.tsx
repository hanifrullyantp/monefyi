import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardScreen } from './screens/DashboardScreen';
import { SafeToSpendScreen } from './screens/SafeToSpendScreen';
import { MonevisorScreen } from './screens/MonevisorScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { DebtScreen } from './screens/DebtScreen';

const screens = [DashboardScreen, SafeToSpendScreen, MonevisorScreen, BudgetScreen, DebtScreen];

interface ScreenRotatorProps {
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function ScreenRotator({ currentIndex, onIndexChange }: ScreenRotatorProps): React.ReactElement {
  const CurrentScreen = screens[currentIndex];

  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <CurrentScreen />
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {screens.map((_, i) => (
          <button
            key={i}
            onClick={() => onIndexChange(i)}
            className={`rounded-full transition-all duration-300 ${
              i === currentIndex ? 'w-4 h-1.5 bg-green-400' : 'w-1.5 h-1.5 bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function useScreenRotator() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % screens.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [paused]);

  return { currentIndex, setCurrentIndex, setPaused };
}
