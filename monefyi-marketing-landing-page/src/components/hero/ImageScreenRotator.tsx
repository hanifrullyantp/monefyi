import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HeroMockupSlide } from '../../types';

interface ImageScreenRotatorProps {
  slides: HeroMockupSlide[];
  intervalSeconds: number;
  paused: boolean;
}

export function ImageScreenRotator({
  slides,
  intervalSeconds,
  paused,
}: ImageScreenRotatorProps): React.ReactElement {
  const valid = slides.filter((s) => s.url);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (paused || valid.length <= 1) return;
    const ms = Math.max(2000, intervalSeconds * 1000);
    const t = setInterval(() => setIndex((i) => (i + 1) % valid.length), ms);
    return () => clearInterval(t);
  }, [paused, valid.length, intervalSeconds]);

  if (!valid.length) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-slate-500 p-4 text-center">
        Upload gambar mockup di Admin
      </div>
    );
  }

  const current = valid[index];

  return (
    <div className="relative h-full w-full bg-slate-950">
      <AnimatePresence mode="wait">
        <motion.img
          key={current.id || current.url}
          src={current.url}
          alt={current.label || 'App mockup'}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
      </AnimatePresence>

      {valid.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {valid.map((s, i) => (
            <button
              key={s.id || i}
              type="button"
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === index ? 'w-4 h-1.5 bg-green-400' : 'w-1.5 h-1.5 bg-slate-700'
              }`}
              aria-label={s.label || `Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function useImageRotatorPause() {
  const [paused, setPaused] = useState(false);
  return { paused, setPaused };
}
