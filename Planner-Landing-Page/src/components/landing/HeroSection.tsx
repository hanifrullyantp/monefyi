"use client";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  FileText,
  Hammer,
  TrendingUp,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { InlineText } from "./InlineEditors";
import type { Transition } from "framer-motion";

const easeOut: Transition = { duration: 0.5, ease: [0.0, 0.0, 0.2, 1.0] };

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { ...easeOut, delay },
});

export function HeroSection() {
  const { content } = useContentStore();
  const { hero } = content;

  const scrollTo = (target: string) => {
    const id = target.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative py-20 md:py-28 lg:py-32 bg-white overflow-hidden"
    >
      {/* Subtle gradient background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-50/40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-[55fr_45fr] gap-12 lg:gap-16 items-center">
          {/* Left Column */}
          <div>
            {/* Badge */}
            <motion.div {...fadeUp(0)}>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.15em] uppercase inline-flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                {hero.badge}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.05)}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mt-6"
            >
              <InlineText 
                value={hero.headline} 
                onSave={(v) => useContentStore.getState().updateSection("hero", { ...hero, headline: v })}
                multiline
              />
            </motion.h1>

            {/* Subheadline */}
            <motion.h2
              {...fadeUp(0.1)}
              className="text-xl md:text-2xl font-bold text-slate-700 mt-6 leading-tight"
            >
              <InlineText 
                value={hero.subheadline} 
                onSave={(v) => useContentStore.getState().updateSection("hero", { ...hero, subheadline: v })}
                multiline
              />
            </motion.h2>

            {/* Pain Paragraph */}
            <motion.p
              {...fadeUp(0.15)}
              className="text-lg text-slate-600 leading-relaxed mt-6 max-w-xl"
            >
              {hero.boldParts && hero.boldParts.length > 0 ? (
                <>
                  {hero.painParagraph.split(hero.boldParts[0])[0]}
                  <strong className="font-semibold text-slate-800">{hero.boldParts[0]}</strong>
                  {hero.painParagraph.split(hero.boldParts[0])[1]}
                </>
              ) : (
                hero.painParagraph
              )}
            </motion.p>

            {/* Quick Points */}
            <motion.div {...fadeUp(0.2)} className="mt-8 space-y-3">
              {hero.quickPoints.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.4, ease: [0, 0, 0.2, 1] }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-base font-medium text-slate-700">{point}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div {...fadeUp(0.45)} className="mt-10">
              <button
                onClick={() => scrollTo(hero.ctaTarget)}
                className="group bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 py-4 font-semibold text-base shadow-xl shadow-slate-900/20 inline-flex items-center gap-2 transition-all duration-200"
              >
                {hero.ctaText}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div {...fadeUp(0.5)} className="mt-8 flex flex-wrap items-center gap-6">
              {hero.trustIndicators.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Column — Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0, 0, 0.2, 1] }}
            className="relative"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md ml-auto">
              {/* Header */}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
                {hero.mockup.dateLabel}
              </p>

              {/* Lead Baru */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-900">
                    {hero.mockup.leadCount} Lead Baru
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-medium text-sm text-slate-900">
                    {hero.mockup.leadExample.name} — {hero.mockup.leadExample.project}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Estimasi: {hero.mockup.leadExample.estimate}
                  </p>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full mt-2 inline-block">
                    {hero.mockup.leadExample.badge}
                  </span>
                </div>
              </div>

              {/* Penawaran Terkirim */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-900">
                    {hero.mockup.offerCount} Penawaran Terkirim
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-medium text-sm text-slate-900">
                    {hero.mockup.offerExample.name} — {hero.mockup.offerExample.project}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{hero.mockup.offerExample.status}</p>
                  <button className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 mt-2">
                    Follow-up
                  </button>
                </div>
              </div>

              {/* Proyek Berjalan */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Hammer className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-900">
                    {hero.mockup.projectCount} Proyek Berjalan
                  </span>
                </div>
                <div className="space-y-2">
                  {hero.mockup.projectExamples.map((project, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm text-slate-900">{project.name}</p>
                        <span className="text-xs font-bold text-slate-700">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Badge — Top Right */}
            <div
              className="absolute -top-3 -right-3 bg-white shadow-lg rounded-full px-4 py-2 border border-slate-100 flex items-center gap-2 animate-float"
              style={{ animationDelay: "0s" }}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">+Rp 45jt</span>
            </div>

            {/* Floating Badge — Bottom Left */}
            <div
              className="absolute -bottom-3 -left-3 bg-white shadow-lg rounded-full px-4 py-2 border border-slate-100 flex items-center gap-2 animate-float"
              style={{ animationDelay: "1.5s" }}
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">PDF Terkirim</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
