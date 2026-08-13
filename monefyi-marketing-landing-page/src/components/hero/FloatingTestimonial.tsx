import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { floatingTestimonials } from '../../data/hero-config';

const avatarColors = [
  'bg-gradient-to-br from-green-500 to-emerald-700',
  'bg-gradient-to-br from-blue-500 to-blue-700',
  'bg-gradient-to-br from-purple-500 to-purple-700',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-red-500 to-pink-700',
];

export function FloatingTestimonial(): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % floatingTestimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const testimonial = floatingTestimonials[currentIndex];

  return (
    <div className="absolute bottom-[-70px] left-1/2 -translate-x-1/2 z-20 w-60">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl p-3 shadow-lg"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-start gap-2.5">
            <div className={`w-8 h-8 rounded-full ${avatarColors[currentIndex]} flex items-center justify-center flex-shrink-0`}>
              <span className="text-sm font-bold text-white">{testimonial.avatar}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] italic text-slate-300 line-clamp-2 leading-relaxed">"{testimonial.quote}"</p>
              <p className="text-[10px] font-semibold text-white mt-1">{testimonial.name}</p>
              <p className="text-[10px] text-slate-500">{testimonial.role}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
