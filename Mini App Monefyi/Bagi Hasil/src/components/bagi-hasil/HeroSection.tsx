"use client";

import { motion, type Variants, type Easing } from "framer-motion";
import { Calculator, BookOpen } from "lucide-react";

interface HeroSectionProps {
  onStartClick: () => void;
  onLearnClick: () => void;
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const easeOut: Easing = [0.0, 0.0, 0.2, 1.0];

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

const akadItems = [
  { nama: "Mudharabah", arab: "المضاربة", emoji: "🤝" },
  { nama: "Musyarakah", arab: "المشاركة", emoji: "🔗" },
  { nama: "Muzara'ah", arab: "المزارعة", emoji: "🌾" },
  { nama: "Mukhabarah", arab: "المخابرة", emoji: "🌱" },
  { nama: "Musaqah", arab: "المساقاة", emoji: "🌳" },
];

export default function HeroSection({
  onStartClick,
  onLearnClick,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-28">
      {/* Arabesque SVG pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="star" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <polygon
                points="40,4 46,28 70,28 51,43 58,67 40,53 22,67 29,43 10,28 34,28"
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
              />
              <circle cx="40" cy="40" r="12" fill="none" stroke="#10b981" strokeWidth="0.8" />
              <circle cx="40" cy="40" r="4" fill="none" stroke="#10b981" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#star)" />
        </svg>
      </div>

      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-green-600/8 blur-2xl" />

      <div className="relative mx-auto max-w-5xl px-4 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Badges */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {[
              "✦ Berdasarkan Al-Qur'an & Sunnah",
              "✦ 5 Jenis Akad",
              "✦ Simulasi Transparan",
            ].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-green-800/60 bg-green-950/60 px-4 py-1.5 text-xs font-medium text-green-400 backdrop-blur-sm"
              >
                {badge}
              </span>
            ))}
          </motion.div>

          {/* Title */}
          <motion.div variants={itemVariants} className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-100 md:text-5xl lg:text-6xl">
              Kalkulator
            </h1>
            <h1 className="text-4xl font-bold tracking-tight text-green-400 md:text-5xl lg:text-6xl">
              Bagi Hasil Islami
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mx-auto max-w-2xl text-base text-slate-400 md:text-lg leading-relaxed"
          >
            Tentukan nisbah yang adil, berkah, dan sesuai syari&apos;ah untuk
            kemitraan usaha Anda. Didukung dalil Al-Qur&apos;an dan Sunnah Rasulullah ﷺ.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={onStartClick}
              className="flex items-center gap-2.5 rounded-2xl bg-gradient-green px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-900/40 transition-all hover:scale-105 hover:shadow-green-900/60 active:scale-100"
            >
              <Calculator className="h-5 w-5" />
              Mulai Hitung Nisbah
            </button>
            <button
              onClick={onLearnClick}
              className="flex items-center gap-2.5 rounded-2xl border border-slate-700 bg-slate-800/60 px-8 py-3.5 text-base font-semibold text-slate-300 backdrop-blur-sm transition-all hover:border-green-700 hover:text-green-400 active:scale-95"
            >
              <BookOpen className="h-5 w-5" />
              Pelajari Jenis Akad
            </button>
          </motion.div>

          {/* Akad icons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            {akadItems.map((a) => (
              <div key={a.nama} className="flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-800/40 bg-green-950/40 text-2xl">
                  {a.emoji}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-300">{a.nama}</p>
                  <p
                    lang="ar"
                    className="font-amiri text-xs text-green-600"
                  >
                    {a.arab}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
