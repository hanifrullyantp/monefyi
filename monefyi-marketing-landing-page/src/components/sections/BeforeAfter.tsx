import React, { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { X, Check, Clock } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { EditableText } from '../admin/EditableText';

export function BeforeAfter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSiteSettings();
  const timelineData = settings.content.transformation;
  const header = settings.content.headers.transformation;
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const scaleY = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <SectionWrapper background="dark" className="overflow-hidden">
      <SectionHeader
        eyebrow={header.eyebrow}
        title={header.title}
        highlight={header.highlight}
        subtitle={header.subtitle}
      />

      <div ref={containerRef} className="max-w-2xl mx-auto relative pt-10 pb-20 px-4 md:px-0 text-left">
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-[2px] bg-slate-800 -translate-x-1/2 z-0" />
        <motion.div className="absolute left-6 md:left-1/2 top-0 w-[2px] bg-green-500 -translate-x-1/2 z-10 origin-top shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{ scaleY }} />

        <div className="space-y-24 relative z-20">
          {timelineData.map((item: any, i: number) => (
            <div key={i} className="relative">
              <div className="flex items-center gap-6 mb-12 pl-4 md:pl-0 md:justify-center relative">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} className="absolute left-6 md:left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 bg-slate-950 border-slate-700 text-slate-500 flex items-center justify-center z-30"><Clock size={18} /></motion.div>
                <div className="ml-12 md:ml-0 md:absolute md:left-[55%] md:top-2 whitespace-nowrap"><span className="text-xs font-black tracking-widest text-white uppercase"><EditableText id={`content_transformation_label_${i}`} defaultValue={item.label} /> — <EditableText id={`content_transformation_time_${i}`} defaultValue={item.time} /></span></div>
              </div>
              <div className="relative mb-8 pl-6 md:pl-0"><div className="md:w-[45%] md:ml-0 md:mr-auto"><motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl border bg-red-500/5 border-red-500/10"><div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0"><X size={16} /></div><h4 className="font-bold text-slate-200"><EditableText id={`content_transformation_before_title_${i}`} defaultValue="Tanpa Monefyi" /></h4></div><p className="text-sm leading-relaxed text-slate-500"><EditableText id={`content_transformation_before_desc_${i}`} defaultValue={item.before} multiline /></p></motion.div></div></div>
              <div className="relative pl-6 md:pl-0"><motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} className="absolute left-6 md:left-1/2 -translate-x-1/2 top-10 w-10 h-10 rounded-full border-2 bg-slate-950 border-green-500 text-green-500 flex items-center justify-center z-30"><Check size={18} /></motion.div><div className="md:w-[45%] md:ml-auto md:mr-0 pt-4"><motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl border bg-green-500/5 border-green-500/20"><div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center flex-shrink-0"><Check size={16} /></div><h4 className="font-bold text-green-400"><EditableText id={`content_transformation_after_title_${i}`} defaultValue="Pakai Monefyi" /></h4></div><p className="text-sm leading-relaxed text-slate-200 font-medium"><EditableText id={`content_transformation_after_desc_${i}`} defaultValue={item.after} multiline /></p></motion.div></div></div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
