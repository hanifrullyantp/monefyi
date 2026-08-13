"use client";

import { motion } from "framer-motion";
import { Scale, BookOpen, Star } from "lucide-react";

interface HeroSectionProps {
  onMulaiHitung: () => void;
  onPelajari: () => void;
}

function IslamicStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" />
    </svg>
  );
}

export function HeroSection({ onMulaiHitung, onPelajari }: HeroSectionProps) {
  return (
    <section
      className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #022c22 0%, #064e3b 50%, #0f172a 100%)",
      }}
    >
      {/* Arabesque decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top left star */}
        <motion.div
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 0.08, rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20 w-80 h-80 text-green-400"
        >
          <IslamicStar className="w-full h-full" />
        </motion.div>

        {/* Bottom right star */}
        <motion.div
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 0.06, rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -right-20 w-96 h-96 text-green-300"
        >
          <IslamicStar className="w-full h-full" />
        </motion.div>

        {/* Center subtle pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #34d399 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-4xl text-center">
        {/* Badge row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {[
            "✦ Berdasarkan Al-Qur'an & Sunnah",
            "✦ Ilmu Faraid Lengkap",
            "✦ Dilengkapi Dalil",
          ].map((badge) => (
            <span
              key={badge}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-green-300 border border-green-700/50 bg-green-900/20 backdrop-blur-sm"
            >
              {badge}
            </span>
          ))}
        </motion.div>

        {/* Main title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <IslamicStar className="w-8 h-8 text-green-400 opacity-60" />
            <span className="text-sm font-semibold text-green-400 tracking-widest uppercase">
              Monefyi
            </span>
            <IslamicStar className="w-8 h-8 text-green-400 opacity-60" />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-2">
            Hitung Waris
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6"
            style={{ color: "#34d399" }}
          >
            Faraid
          </h2>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Hitung pembagian harta warisan sesuai syari&apos;ah Islam dengan dalil yang
          lengkap dan penjelasan yang mudah dipahami.
          <br />
          <span className="text-green-400 font-medium">
            Berdasarkan Al-Qur&apos;an, Sunnah, dan Ijma&apos; Ulama.
          </span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={onMulaiHitung}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg text-white shadow-lg hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            }}
          >
            <Scale className="w-5 h-5" />
            Mulai Hitung Waris
          </button>

          <button
            onClick={onPelajari}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg text-green-300 border border-green-700/50 bg-green-900/20 hover:bg-green-900/40 transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm"
          >
            <BookOpen className="w-5 h-5" />
            Pelajari Ilmu Faraid
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
        >
          {[
            { label: "Ahli Waris", value: "17 Jenis" },
            { label: "Dalil Al-Qur'an", value: "4 Ayat" },
            { label: "Aturan Hajb", value: "Lengkap" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl font-bold text-green-400">
                {stat.value}
              </div>
              <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-green-700/50 flex items-start justify-center pt-2"
        >
          <div className="w-1.5 h-3 rounded-full bg-green-500/70" />
        </motion.div>
      </motion.div>

      {/* Decorative stars */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: `${15 + i * 15}%`,
            left: i % 2 === 0 ? `${5 + i * 3}%` : undefined,
            right: i % 2 !== 0 ? `${5 + i * 3}%` : undefined,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{
            delay: i * 0.3,
            duration: 3 + i,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Star className="w-3 h-3 text-green-400 fill-current" />
        </motion.div>
      ))}
    </section>
  );
}
