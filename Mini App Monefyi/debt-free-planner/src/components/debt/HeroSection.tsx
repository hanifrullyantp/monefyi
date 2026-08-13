// src/components/debt/HeroSection.tsx
"use client";

import { motion } from "framer-motion";
import { Zap, TrendingDown, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function HeroSection() {
  const scrollToForm = () => {
    const el = document.getElementById("debt-form-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #022c22 0%, #064e3b 50%, #020617 100%)",
        }}
      />

      {/* Decorative orbs */}
      <div className="absolute top-20 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <Zap className="text-amber-400" size={14} />
          <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
            Mulai Perjalanan Bebas Hutang
          </span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-4">
            Bebas Hutang
            <br />
            <span className="gradient-text-green">Mulai Hari Ini</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Rencanakan pelunasan hutangmu dengan strategi terbukti. Lihat kapan kamu bisa
            bebas, berapa yang bisa dihemat, dan langkah spesifik setiap bulannya.
          </p>
        </motion.div>

        {/* Stats mini */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex flex-wrap justify-center gap-6 mt-10 mb-10"
        >
          {[
            { icon: TrendingDown, text: "Hemat Bunga hingga 40%", color: "text-emerald-400" },
            { icon: Clock, text: "Lebih Cepat Lunas", color: "text-amber-400" },
            { icon: Award, text: "Bebas Dari Cicilan", color: "text-emerald-400" },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={18} className={color} />
              <span className="text-sm text-slate-300 font-medium">{text}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button
            size="xl"
            onClick={scrollToForm}
            className="shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50"
          >
            <Zap size={20} />
            Mulai Hitung Sekarang
          </Button>
          <p className="text-xs text-slate-500 mt-3">
            Gratis, tanpa daftar, data tersimpan di browser Anda
          </p>
        </motion.div>
      </div>
    </section>
  );
}
