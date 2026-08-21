"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/shared/Container";
import { useContentStore } from "@/lib/store/contentStore";
import { Clock, X, Check } from "lucide-react";
import { EditableText } from "@/components/shared/EditableText";

export function TransformationSection() {
  const { content } = useContentStore();
  const { transformation } = content;

  return (
    <section className="py-24 md:py-32 bg-white text-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-5" />
      <Container className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-24 px-4"
        >
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-5 py-2 text-[10px] font-black tracking-[0.2em] uppercase mb-6 shadow-sm">
            <EditableText section="transformation" field="badge" value={transformation.badge} />
          </span>
          <h2 className="text-3xl md:text-6xl font-black mb-6 tracking-tight text-slate-900">
            {transformation.title.split("Berbeda Jauh")[0]}
            <span className="text-emerald-600">Berbeda Jauh</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">
            <EditableText section="transformation" field="subtitle" value={transformation.subtitle} />
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto relative px-4">
          {/* Vertical Line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-16 md:space-y-32">
            {transformation.scenarios.map((scenario, i) => (
              <div key={i} className="relative">
                {/* Time Node */}
                <div className="flex items-center gap-4 md:absolute md:left-1/2 md:-translate-x-1/2 md:-top-16 mb-8 md:mb-0 relative z-20">
                   <div className="w-10 h-10 md:w-12 md:h-12 rounded-full md:rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap bg-slate-50 px-3 py-1 rounded-full">
                    {scenario.time}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-32 md:pt-8">
                  {/* Tanpa Estimator (Left Card) */}
                  <div className="relative pl-12 md:pl-0">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="bg-[#fdf2f2]/50 border border-rose-100 rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-sm relative overflow-hidden group"
                    >
                      <div className="flex items-center gap-4 mb-4 md:mb-6">
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                          <X className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                        <h4 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tight">Tanpa Estimator</h4>
                      </div>
                      <p className="text-sm md:text-base text-slate-500 leading-relaxed font-bold">
                        {scenario.without}
                      </p>
                    </motion.div>
                  </div>

                  {/* Central Node Check Circle */}
                  <div className="absolute left-[8px] md:left-1/2 md:-translate-x-1/2 top-[55%] md:top-1/2 -translate-y-1/2 z-20">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-glow">
                      <Check className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>

                  {/* Pakai Estimator (Right Card) */}
                  <div className="relative pl-12 md:pl-0 md:mt-24">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="bg-[#f0fdf4]/50 border border-emerald-100 rounded-[24px] md:rounded-[40px] p-6 md:p-10 shadow-lg shadow-emerald-500/5 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-4 mb-4 md:mb-6">
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <Check className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                        <h4 className="text-base md:text-xl font-black text-emerald-600 uppercase tracking-tight">Pakai Estimator</h4>
                      </div>
                      <p className="text-sm md:text-base text-slate-800 leading-relaxed font-black">
                        {scenario.with}
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
