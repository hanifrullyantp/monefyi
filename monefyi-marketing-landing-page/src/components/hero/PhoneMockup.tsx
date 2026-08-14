import React from 'react';
import { motion } from 'framer-motion';
import { PhoneFrame } from './PhoneFrame';
import { ScreenRotator, useScreenRotator } from './ScreenRotator';
import { ImageScreenRotator, useImageRotatorPause } from './ImageScreenRotator';
import { EditablePhoneScreen } from '../admin/EditablePhoneScreen';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import type { HeroMockupSettings } from '../../types';

const DEFAULT_MOCKUP: HeroMockupSettings = {
  mode: 'screens',
  intervalSeconds: 4,
  slides: [],
};

export function PhoneMockup(): React.ReactElement {
  const { settings } = useSiteSettings();
  const mockup: HeroMockupSettings = {
    ...DEFAULT_MOCKUP,
    ...settings.content.hero?.mockup,
  };

  const useImages =
    mockup.mode === 'images' &&
    (mockup.slides || []).some((s) => s.url);

  const screenRotator = useScreenRotator(mockup.intervalSeconds || 4);
  const imagePause = useImageRotatorPause();

  const paused = useImages ? imagePause.paused : screenRotator.paused;
  const setPaused = useImages ? imagePause.setPaused : screenRotator.setPaused;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative flex items-center justify-center"
      style={{ paddingBottom: 40, paddingTop: 20 }}
    >
      <div className="relative">
        <div className="relative mx-auto">
          <PhoneFrame
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="shadow-2xl"
          >
            {useImages ? (
              <ImageScreenRotator
                slides={mockup.slides}
                intervalSeconds={mockup.intervalSeconds || 4}
                paused={paused}
              />
            ) : (
              <>
                <ScreenRotator
                  currentIndex={screenRotator.currentIndex}
                  onIndexChange={screenRotator.setCurrentIndex}
                />
                <EditablePhoneScreen />
              </>
            )}
          </PhoneFrame>
        </div>

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">
              {useImages ? 'Live Preview' : 'Offline Mode'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
