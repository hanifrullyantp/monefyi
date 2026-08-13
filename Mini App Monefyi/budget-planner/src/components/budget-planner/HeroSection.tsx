"use client";

import { motion } from "framer-motion";
import { ArrowDown, Sparkles, BarChart3, Clock, BookOpen } from "lucide-react";

interface HeroSectionProps {
  onStart: () => void;
}

export function HeroSection({ onStart }: HeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #022c22 0%, #064e3b 100%)" }}
      aria-label="Budget Planner Hero"
    >
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, #34d399 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-green-500/10 blur-3xl" />
      <div className="absolute bottom-10 right-1/4 w-48 h-48 rounded-full bg-green-400/10 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {[
            "✦ Auto Mode",
            "✦ 5 Metode Budget",
            "✦ Insight Otomatis",
          ].map((badge) => (
            <span
              key={badge}
              className="px-3 py-1 text-xs font-medium rounded-full border border-green-700 bg-green-900/40 text-green-300"
            >
              {badge}
            </span>
          ))}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-green-400" />
            <span className="text-sm font-medium text-green-400 uppercase tracking-widest">
              Monefyi
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 leading-tight">
            Budget Planner
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold text-green-400 mb-6">
            Auto Mode
          </h2>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-4">
            Masukkan penghasilan Anda. Kami atur alokasi terbaik
            <br className="hidden md:block" />
            berdasarkan metode budgeting yang telah terbukti.
          </p>
          <p className="text-sm text-green-400 font-medium">
            &ldquo;Masukkan Penghasilan. Kami Atur Sisanya.&rdquo;
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={onStart}
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/30"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
            aria-label="Mulai rencanakan budget"
          >
            Mulai Rencanakan Budget
            <ArrowDown
              size={18}
              className="transition-transform group-hover:translate-y-1"
            />
          </button>
        </motion.div>

        {/* Visual illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 flex justify-center px-4"
        >
          <div className="relative flex items-end gap-2 md:gap-3">
            {/* Mini bar chart illustration */}
            {[
              { h: 60, color: "#3b82f6", label: "Kebutuhan" },
              { h: 36, color: "#8b5cf6", label: "Keinginan" },
              { h: 24, color: "#10b981", label: "Tabungan" },
            ].map((bar, i) => (
              <motion.div
                key={bar.label}
                initial={{ height: 0 }}
                animate={{ height: bar.h }}
                transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                className="w-14 md:w-16 rounded-t-xl flex items-end justify-center pb-2"
                style={{ backgroundColor: bar.color, height: bar.h }}
                aria-label={bar.label}
              >
                <span className="text-[10px] font-bold text-white opacity-80">
                  {bar.label === "Kebutuhan" ? "50%" : bar.label === "Keinginan" ? "30%" : "20%"}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          {[
            { icon: BarChart3, label: "5 Metode Budget", value: "Pilih terbaik" },
            { icon: Sparkles, label: "Auto Alokasi", value: "Instan" },
            { icon: BookOpen, label: "Insight Cerdas", value: "Personal" },
            { icon: Clock, label: "Simpan Riwayat", value: "12 Bulan" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-green-800/40 bg-green-900/20 p-4 text-center"
            >
              <Icon size={20} className="text-green-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-green-300">{value}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
