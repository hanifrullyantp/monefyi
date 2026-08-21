"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Zap,
  Users,
  Star,
} from "lucide-react";
import { useRef } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { EditableImage } from "@/components/shared/EditableImage";
import { useUIStore } from "@/lib/store/uiStore";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, delay, type: "spring" as const, stiffness: 100 },
});

export function PremiumHeroSection() {
  const { content } = useContentStore();
  const { hero } = content;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section
      ref={ref}
      id="hero"
      className="relative pt-32 pb-24 md:pt-40 md:pb-32 lg:pb-40 overflow-hidden min-h-screen flex items-center"
    >
      {/* Premium Animated Background */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 grid-pattern" />
      
      {/* Animated Orbs */}
      <motion.div
        style={{ y, opacity }}
        className="absolute top-20 right-10 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"
      />
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]) }}
        className="absolute bottom-20 left-10 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl"
      />

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 hidden lg:block"
      >
        <div className="glass rounded-3xl p-4 shadow-premium">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">+42% Revenue</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/3 left-1/4 hidden lg:block"
      >
        <div className="glass rounded-3xl p-4 shadow-premium">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">1.200+ Users</span>
          </div>
        </div>
      </motion.div>

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-12 lg:gap-16 items-center">
          {/* Left Column */}
          <div>
            {/* Badge */}
            <motion.div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 glass rounded-full px-5 py-2 text-xs font-bold tracking-wide uppercase shadow-premium">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-gradient">{hero.badge}</span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.1)}
              className="mt-8 text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <EditableText
                section="hero"
                field="headline"
                value={hero.headline}
                multiline
              />
            </motion.h1>

            {/* Subheadline */}
            <motion.h2
              {...fadeUp(0.2)}
              className="mt-6 text-2xl md:text-3xl font-bold text-slate-700"
            >
              <EditableText section="hero" field="subheadline" value={hero.subheadline} />
            </motion.h2>

            {/* Pain Paragraph */}
            <motion.p
              {...fadeUp(0.3)}
              className="mt-6 text-xl text-slate-600 leading-relaxed max-w-xl"
            >
              <EditableText
                section="hero"
                field="painParagraph"
                value={hero.painParagraph}
                multiline
              />
            </motion.p>

            {/* Quick Points */}
            <motion.ul {...fadeUp(0.35)} className="mt-10 space-y-4">
              {hero.quickPoints.map((point, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="relative">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 relative z-10" />
                    <div className="absolute inset-0 bg-emerald-400/30 blur-md group-hover:blur-lg transition-all" />
                  </div>
                  <span className="text-lg font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {point}
                  </span>
                </motion.li>
              ))}
            </motion.ul>

            {/* CTA Buttons */}
            <motion.div
              {...fadeUp(0.6)}
              className="mt-12 flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={() => scrollTo("#tiga-step")}
                className="group relative overflow-hidden flex items-center justify-center gap-3 gradient-premium text-white rounded-2xl px-10 py-5 font-bold text-lg shadow-premium hover:shadow-glow transition-all duration-300 btn-premium"
              >
                <span className="relative z-10">{hero.ctaPrimary}</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform relative z-10" />
              </button>
              <button className="group flex items-center justify-center gap-3 glass border-2 border-emerald-200 text-emerald-700 hover:border-emerald-300 rounded-2xl px-10 py-5 font-bold text-lg shadow-premium hover:shadow-xl transition-all duration-300">
                <PlayCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {hero.ctaSecondary}
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              {...fadeUp(0.7)}
              className="mt-10 flex flex-wrap items-center gap-8"
            >
              {hero.trustIndicators.map((item) => (
                <span key={item} className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium">{item}</span>
                </span>
              ))}
            </motion.div>

          </div>

          {/* Right Column - Premium Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.4, type: "spring" }}
            className="relative lg:ml-8"
          >
            {/* Floating Stats */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -left-6 z-20"
            >
              <div className="glass rounded-2xl p-4 shadow-premium">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gradient">+Rp 45jt</p>
                    <p className="text-xs text-slate-600">Deal Baru Hari Ini</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -right-6 z-20"
            >
              <div className="glass rounded-2xl p-4 shadow-premium">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">PDF Terkirim</p>
                    <p className="text-xs text-slate-500">Ibu Sari · 2 menit lalu</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Dashboard Card with Inline Edit Image Wrapper */}
            <div className="relative group">
              <div className="relative glass rounded-3xl p-6 md:p-8 shadow-premium border-2 border-white/50 overflow-hidden min-h-[400px]">
                {/* Editable Image as Background of the mockup if needed, but let's make it a dedicated section */}
                <div className="absolute inset-0 opacity-10">
                   <EditableImage
                    section="hero"
                    field="dashboardImage"
                    src={hero.dashboardImage || ""}
                    alt="Dashboard Preview"
                    className="w-full h-full"
                  />
                </div>

                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl" />
                
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Dashboard Live
                      </p>
                      <p className="text-xl font-extrabold text-slate-900">
                        Senin, 15 Januari 2026
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-600">Live</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { label: "Lead Baru", value: "3", color: "blue" },
                      { label: "Penawaran", value: "2", color: "purple" },
                      { label: "Proyek Aktif", value: "4", color: "emerald" },
                      { label: "Revenue", value: "320jt", color: "amber" },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className={`glass-dark rounded-2xl p-4 border border-${stat.color}-500/20`}
                      >
                        <p className="text-3xl font-extrabold text-white mb-1">{stat.value}</p>
                        <p className="text-xs text-slate-300">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-3">
                    {[
                      { name: "Villa Ciater", progress: 78, color: "emerald" },
                      { name: "Kitchen Set Bpk Rudi", progress: 45, color: "blue" },
                    ].map((project, i) => (
                      <div key={project.name} className="glass-dark rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-white">{project.name}</p>
                          <span className="text-xs font-bold text-emerald-400">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress}%` }}
                            transition={{ duration: 1.5, delay: 0.8 + i * 0.2, ease: "easeOut" }}
                            className={`h-full bg-gradient-to-r from-${project.color}-400 to-${project.color}-600 rounded-full relative`}
                          >
                            <div className="absolute inset-0 bg-white/30 animate-pulse" />
                          </motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Trigger dedicated for swapping the background image of the mockup */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-2xl border border-white/10">
                  CLICK MOCKUP TO SWAP BG IMAGE
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
