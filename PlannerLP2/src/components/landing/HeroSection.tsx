"use client";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ArrowDown, PlayCircle, Zap, Star } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { EditableImage } from "@/components/shared/EditableImage";
import { useContentStore } from "@/lib/store/contentStore";

export function HeroSection() {
  const { content } = useContentStore();
  const { hero } = content;

  const scrollToStep = () => {
    const el = document.getElementById("tiga-step");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative overflow-hidden bg-white">
      {/* Background Decor - Desktop Only */}
      <div className="absolute inset-0 mesh-gradient opacity-40 hidden md:block" />
      <div className="absolute inset-0 dot-pattern opacity-10" />

      <Container className="relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 items-center pt-20 pb-10 md:pt-32 md:pb-32">
          
          {/* 1. BADGE & HEADLINE (Order 1) */}
          <div className="order-1 flex flex-col items-center md:items-start w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-2 md:mt-0 text-[32px] sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight text-center md:text-left"
            >
              <EditableText 
                section="hero" 
                field="headline" 
                value={hero.headline} 
                multiline
              />
            </motion.h1>
          </div>

          {/* 2. IMAGE HERO (Mobile: Order 2, Desktop: Column 2) */}
          <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-4 mt-6 mb-6 lg:mt-0 lg:mb-0 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/10 blur-[100px] rounded-full -z-10 hidden md:block" />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.4, type: "spring" }}
              className="relative"
            >
              <div className="glass rounded-[28px] md:rounded-[48px] p-1.5 md:p-4 shadow-2xl border-2 md:border-8 border-white/50 overflow-hidden card-3d">
                <EditableImage
                  section="hero"
                  field="dashboardImage"
                  src={hero.dashboardImage || ""}
                  alt="Monefyi Dashboard"
                  className="w-full h-full rounded-[20px] md:rounded-[36px]"
                />
              </div>

              {/* Floating Stat Card - Desktop Only */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 hidden lg:block"
              >
                <div className="glass rounded-3xl p-6 shadow-premium border-2 border-white/80">
                  <div className="flex items-center gap-4 mb-4 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-glow">
                      <Zap className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                      <p className="text-2xl font-black text-emerald-600">+300%</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-[85%] bg-emerald-500 rounded-full" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400">Closing rate boost</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* 3. SUBHEADLINE, FEATURES, CTA (Order 3) */}
          <div className="order-3 flex flex-col lg:col-start-1 items-center md:items-start w-full">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base md:text-lg lg:text-2xl text-slate-600 leading-relaxed max-w-xl font-bold text-center md:text-left"
            >
              <EditableText 
                section="hero" 
                field="subheadline" 
                value={hero.subheadline} 
                multiline
              />
            </motion.p>

            {/* Trust indicators — mobile (posisi ex-Saring WA) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="md:hidden mt-5 flex flex-col items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"
            >
              {hero.trustIndicators.map((item, i) => (
                <span key={i}>{item}</span>
              ))}
            </motion.div>

            {/* Quick points — desktop */}
            <ul className="hidden md:flex flex-col mt-8 space-y-4 text-slate-700 font-bold">
              {hero.quickPoints.map((text, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex items-center gap-3 text-lg group"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-500 transition-all">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:text-white transition-all" />
                  </div>
                  {text}
                </motion.li>
              ))}
            </ul>

            {/* CTA BUTTONS */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto"
            >
              <button
                onClick={scrollToStep}
                className="w-full md:w-fit relative overflow-hidden group gradient-premium text-white rounded-2xl px-10 py-5 font-black text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95 btn-premium flex items-center justify-center gap-3"
              >
                <span className="relative z-10">{hero.ctaPrimary}</span>
                <ArrowDown className="w-6 h-6 group-hover:translate-y-1 transition-transform relative z-10" />
              </button>
              
              <button className="hidden md:flex items-center justify-center gap-3 glass border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-50 rounded-2xl px-8 py-5 font-bold text-lg transition-all">
                <PlayCircle className="w-6 h-6" />
                {hero.ctaSecondary}
              </button>
            </motion.div>

            {/* TRUST BAR */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="hidden md:flex mt-10 flex-wrap items-center gap-4 text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest"
            >
              {hero.trustIndicators.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span>{item}</span>
                  {i < hero.trustIndicators.length - 1 && (
                    <span className="text-slate-200 hidden sm:inline">|</span>
                  )}
                </div>
              ))}
            </motion.div>

            {/* MOBILE SCROLL INDICATOR */}
            <motion.button
              onClick={scrollToStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="md:hidden flex flex-col items-center gap-2 mt-8 text-slate-400 font-black text-[10px] tracking-widest"
            >
              PELAJARI CARANYA
              <div className="animate-bounce p-2 rounded-full bg-slate-50 border border-slate-100">
                <ArrowDown size={16} />
              </div>
            </motion.button>
          </div>
        </div>
      </Container>
    </section>
  );
}
