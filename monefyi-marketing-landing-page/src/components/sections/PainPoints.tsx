import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Frown, Meh, AlertCircle } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { GradientText } from '../ui/GradientText';
import { cn } from '../../lib/cn';
import { EditableText } from '../admin/EditableText';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export function PainPoints() {
  const { settings } = useSiteSettings();
  const content = settings.content.painPoints;
  const header = settings.content.headers.pain_points;
  const [checked, setChecked] = useState<number[]>([]);

  const toggle = (idx: number) => {
    if (checked.includes(idx)) setChecked(checked.filter(i => i !== idx));
    else setChecked([...checked, idx]);
  };

  const message = useMemo(() => {
    const count = checked.length;
    if (count === 0) return 'Berapa banyak yang kamu alami?';
    if (count <= 2) return 'Ya, kami paham. Ada cara memperbaiki ini...';
    if (count <= 5) return '78% profesional muda alami hal yang sama.';
    return 'Kondisimu SANGAT BISA diperbaiki.';
  }, [checked]);

  const Icon = useMemo(() => {
    const count = checked.length;
    if (count === 0) return Meh;
    if (count <= 2) return Meh;
    if (count <= 5) return Frown;
    return AlertCircle;
  }, [checked]);

  return (
    <SectionWrapper background="alt">
      <SectionHeader
        eyebrow={header.eyebrow}
        title={header.title}
        highlight={header.highlight}
        subtitle={header.subtitle}
      />

      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {content.map((point: string, i: number) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(i)}
              className={cn(
                'flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group',
                checked.includes(i) 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0',
                checked.includes(i) ? 'bg-red-500' : 'bg-slate-700 group-hover:bg-slate-600'
              )}>
                {checked.includes(i) && <Check size={14} className="text-white" />}
              </div>
              <span className={cn(
                'text-sm font-medium transition-all',
                checked.includes(i) ? 'text-slate-500 line-through' : 'text-slate-200'
              )}>
                <EditableText id={`content_painPoints_${i}`} defaultValue={point} />
              </span>
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 glass rounded-3xl border-red-500/20"
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors duration-500',
              checked.length > 5 ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-slate-800'
            )}>
              <Icon size={32} />
            </div>
            
            <h4 className="text-xl font-bold text-white">
              {checked.length} dari {content.length} Masalah Terpilih
            </h4>
            
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg"
              >
                <GradientText variant={checked.length > 5 ? 'red' : 'green'} className="font-bold">
                  {message}
                </GradientText>
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
