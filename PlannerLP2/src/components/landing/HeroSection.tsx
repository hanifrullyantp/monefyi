"use client";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ArrowDown, PlayCircle, Zap, LayoutDashboard } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { EditableImage } from "@/components/shared/EditableImage";
import { AnimatedHeadline } from "@/components/landing/AnimatedHeadline";
import { useContentStore } from "@/lib/store/contentStore";
import { defaultContent } from "@/data/defaultContent";
import { useAuthStore } from "@/lib/store/authStore";
import { navigateToPlannerApp } from "@/lib/config/plannerApp";

export function HeroSection() {
  const { content } = useContentStore();
  const { hero } = content;
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const headlineConfig = hero.headlineAnimated ?? defaultContent.hero.headlineAnimated;

  const scrollToStep = () => {
    const el = document.getElementById("tiga-step");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  const handlePrimaryCta = () => {
    if (hydrated && isAuthenticated) {
      navigateToPlannerApp("/app");
      return;
    }
    scrollToStep();
  };

  const primaryCtaLabel = hydrated && isAuthenticated ? "Masuk" : hero.ctaPrimary;
  const PrimaryCtaIcon = hydrated && isAuthenticated ? LayoutDashboard : ArrowDown;

  return (
    <section id="hero" className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 mesh-gradient opacity-40 hidden md:block" />
      <div className="absolute inset-0 dot-pattern opacity-10" />

      <Container className="relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 items-center pt-20 pb-10 md:pt-32 md:pb-32">

          <div className="order-1 flex flex-col items-center md:items-start w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-2 md:mt-0 text-[32px] sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight text-center md:text-left"
            >
              <AnimatedHeadline config={headlineConfig} />
            </motion.h1>
          </div>

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

            <ul className="flex flex-col mt-6 md:mt-8 space-y-3 md:space-y-4 text-slate-700 font-bold w-full max-w-xl">
              {hero.quickPoints.map((text, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-3 text-sm sm:text-base md:text-lg group text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-all mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:text-white transition-all" />
                  </div>
                  <span className="leading-snug">{text}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto"
            >
              <button
                type="button"
                onClick={handlePrimaryCta}
                className="w-full md:w-fit relative overflow-hidden group gradient-premium text-white rounded-2xl px-10 py-5 font-black text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95 btn-premium flex items-center justify-center gap-3"
              >
                <span className="relative z-10">{primaryCtaLabel}</span>
                <PrimaryCtaIcon
                  className={`w-6 h-6 relative z-10 transition-transform ${
                    hydrated && isAuthenticated
                      ? "group-hover:translate-x-0.5"
                      : "group-hover:translate-y-1"
                  }`}
                />
              </button>

              <button className="hidden md:flex items-center justify-center gap-3 glass border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-50 rounded-2xl px-8 py-5 font-bold text-lg transition-all">
                <PlayCircle className="w-6 h-6" />
                {hero.ctaSecondary}
              </button>
            </motion.div>

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
