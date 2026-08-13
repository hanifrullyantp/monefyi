import React from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { PremiumIcon } from '../ui/PremiumIcon';
import { EditableText } from '../admin/EditableText';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export function HowItWorks() {
  const { settings } = useSiteSettings();
  const content = settings.content.howItWorks;
  const header = settings.content.headers.how_it_works;

  return (
    <SectionWrapper background="alt">
      <SectionHeader
        eyebrow={header.eyebrow}
        title={header.title}
        highlight={header.highlight}
        subtitle={header.subtitle}
      />

      <div className="relative">
        <div className="hidden lg:block absolute top-[20%] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 z-0" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          {content.map((step: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 hover:border-slate-700 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <PremiumIcon name={step.icon as any} variant="glow" color={step.color as any} size="lg" />
                <span className="text-4xl font-black text-slate-800 group-hover:text-slate-700 transition-colors">0{i + 1}</span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">
                <EditableText id={`content_howItWorks_title_${i}`} defaultValue={step.title} />
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                <EditableText id={`content_howItWorks_desc_${i}`} defaultValue={step.desc} multiline />
              </p>
              
              <ul className="space-y-2">
                {step.items.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <EditableText id={`content_howItWorks_item_${i}_${idx}`} defaultValue={item} />
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
