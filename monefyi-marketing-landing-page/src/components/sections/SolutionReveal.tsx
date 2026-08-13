import React from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from '../ui/SectionWrapper';
import { GradientText } from '../ui/GradientText';
import { siteConfig } from '../../data/site-config';

export function SolutionReveal() {
  return (
    <SectionWrapper background="green" innerClassName="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-xs font-bold text-green-400 uppercase tracking-[0.3em] mb-4 block">
          INTRODUCING
        </span>
        <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">
          <GradientText variant="green">{siteConfig.name}</GradientText>
        </h2>
        <p className="text-lg md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Satu-satunya aplikasi keuangan yang tidak cuma mencatat, tapi memberitahu Anda 
          <span className="text-white font-bold"> APA yang harus dilakukan </span> 
          hari ini untuk bebas dari lingkaran gaji habis selamanya.
        </p>
      </motion.div>
    </SectionWrapper>
  );
}
