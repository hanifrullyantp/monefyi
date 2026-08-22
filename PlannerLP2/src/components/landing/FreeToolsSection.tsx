"use client";
import { motion } from "framer-motion";
import {
  Calculator,
  FileText,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Gift,
  DollarSign,
  BarChart3,
  Wallet,
  Clock,
  Sparkles,
} from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  FileText,
  MessageSquare,
  TrendingUp,
  DollarSign,
  BarChart3,
  Wallet,
};

export function FreeToolsSection() {
  const { content } = useContentStore();
  const { freeTools } = content;

  // Calculate total value (mock calculation based on text)
  const totalValue = "Rp 846.000";

  return (
    <section className="py-14 md:py-32 bg-white relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-amber-400/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />

      <Container className="relative z-10">
        {/* Header with Gift Icon */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-glow animate-float"
          >
            <Gift className="w-10 h-10 text-white" />
          </motion.div>

          <span className="inline-block bg-amber-100 text-amber-700 rounded-full px-5 py-2 text-[10px] font-black tracking-[0.2em] uppercase mb-6 shadow-sm">
            <EditableText section="freeTools" field="badge" value={freeTools.badge} />
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            <EditableText section="freeTools" field="title" value={freeTools.title} />
          </h2>
          <p className="text-xl text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed mb-8">
            <EditableText section="freeTools" field="subtitle" value={freeTools.subtitle} />
          </p>

          {/* Value Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-4 bg-slate-900 text-white px-8 py-4 rounded-[24px] shadow-2xl border border-white/10"
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Bonus Senilai</span>
              <span className="text-2xl font-black text-emerald-400 leading-none">{totalValue}</span>
            </div>
            <div className="w-px h-10 bg-white/20 mx-2" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-black uppercase tracking-widest text-emerald-100">GRATIS!</span>
            </div>
          </motion.div>
        </div>

        {/* Bonus Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {freeTools.tools.map((tool, i) => {
            const Icon = iconMap[tool.icon] || Gift;
            return (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="group relative bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-emerald-300 transition-all duration-500 flex flex-col overflow-hidden"
              >
                {/* Ribbon Effect */}
                <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute top-4 right-[-24px] w-32 h-10 bg-amber-400 rotate-45 flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">BONUS!</span>
                  </div>
                </div>

                <div className="relative mb-8">
                  <div className="w-16 h-16 rounded-[22px] bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-slate-900 text-emerald-400 text-[10px] font-black py-1.5 px-3 rounded-full shadow-lg border border-white/20">
                    Worth {tool.badge}
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-4 leading-tight group-hover:text-emerald-600 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-slate-500 font-bold leading-relaxed mb-8 flex-1">
                  {tool.description}
                </p>

                <div className="pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 transition-colors">
                    <span>Status</span>
                    <span className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                       Ready
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Scarcity */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 max-w-2xl mx-auto"
        >
          <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                  <Clock className="w-6 h-6 animate-pulse" />
               </div>
               <p className="text-sm text-slate-600 font-bold leading-tight">
                  <EditableText section="freeTools" field="note" value={freeTools.note} />
               </p>
            </div>
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95">
               Klaim Semua Bonus
               <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
