import React from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { PremiumIcon } from '../ui/PremiumIcon';
import { EditableText } from '../admin/EditableText';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export function FeaturesShowcase() {
  const { settings } = useSiteSettings();
  const features = settings.content.features;
  const header = settings.content.headers.features;

  const bigFeatures = features.filter((f: any) => f.size === 'big');
  const smallFeatures = features.filter((f: any) => f.size === 'small');

  return (
    <SectionWrapper id="features">
      <SectionHeader
        eyebrow={header.eyebrow}
        title={header.title}
        highlight={header.highlight}
        subtitle={header.subtitle}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {bigFeatures.map((f: any, i: number) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 overflow-hidden hover:border-slate-700 transition-all shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[80px] rounded-full group-hover:bg-green-500/10 transition-colors" />
            
            <div className="relative z-10">
              <PremiumIcon name={f.icon as any} variant="glow" color={f.color as any} size="xl" className="mb-8" />
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4">
                <EditableText id={`content_features_big_title_${i}`} defaultValue={f.title} />
              </h3>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                <EditableText id={`content_features_big_desc_${i}`} defaultValue={f.description} multiline />
              </p>
            </div>

            {/* Feature Demo Illustration */}
            <div className="mt-8 relative h-40 bg-slate-950/50 rounded-2xl border border-slate-800 p-4 overflow-hidden">
               {f.imageUrl ? (
                 <img
                   src={f.imageUrl}
                   alt={f.title}
                   className="w-full h-full object-contain object-center rounded-lg"
                 />
               ) : f.id === 'safe-to-spend' ? (
                 <div className="flex flex-col items-center justify-center h-full">
                    <motion.div animate={{ y: [0, -5, 0], opacity: [0.8, 1, 0.8] }} transition={{ duration: 3, repeat: Infinity }} className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">HARI INI</span>
                      <span className="text-3xl font-black text-green-400">Rp 78.000</span>
                    </motion.div>
                    <div className="mt-4 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: '66%' }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-green-500 rounded-full" />
                    </div>
                 </div>
               ) : f.id === 'monevisor' ? (
                 <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center"><span className="text-[10px] font-bold text-green-400">AI</span></div>
                      <motion.div animate={{ width: ['20%', '60%', '20%'] }} transition={{ duration: 4, repeat: Infinity }} className="h-6 bg-slate-800 rounded-lg" />
                    </div>
                    <div className="h-16 w-full bg-slate-800/50 rounded-lg border-l-2 border-green-500 p-3">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="space-y-2">
                        <div className="h-2 w-full bg-slate-700 rounded-full" />
                        <div className="h-2 w-2/3 bg-slate-700 rounded-full" />
                      </motion.div>
                    </div>
                 </div>
               ) : (
                 /* Fallback animations for others */
                 <div className="flex items-center justify-center h-full">
                    <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 5, repeat: Infinity }} className="text-slate-800">
                       <PremiumIcon name={f.icon as any} size="xl" color="slate" />
                    </motion.div>
                 </div>
               )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {smallFeatures.map((f: any, i: number) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all hover:-translate-y-1 shadow-lg"
          >
            <PremiumIcon name={f.icon as any} variant="filled" color={f.color as any} size="sm" className="mb-4" />
            <h4 className="text-sm font-bold text-white mb-2">
              <EditableText id={`content_features_small_title_${i}`} defaultValue={f.title} />
            </h4>
            <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">
              <EditableText id={`content_features_small_desc_${i}`} defaultValue={f.description} multiline />
            </p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
