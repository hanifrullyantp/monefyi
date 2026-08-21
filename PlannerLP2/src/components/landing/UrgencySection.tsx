"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";

import { ArrowRight, AlertTriangle } from "lucide-react";

export function UrgencySection() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 44,
    seconds: 32,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  const scrollToPricing = () => {
    const el = document.getElementById("harga");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section className="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-[48px] p-8 md:p-16 bg-white border-[6px] border-rose-500/10 animate-shadow-pulse-red text-center relative"
        >
          {/* Header */}
          <div className="mb-10">
            <span className="inline-block bg-rose-100 text-rose-600 rounded-full px-5 py-2 text-[10px] font-black tracking-[0.2em] uppercase mb-6">
              BONUS HARI INI!!
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-4">
              JANGAN SAMPAI MENYESAL
            </h2>
            <p className="text-xl text-rose-600 font-black uppercase tracking-widest">Tidak Kebagian ya..</p>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.3em] mt-4">Hanya Untuk 20 Orang Tercepat Saja</p>
          </div>

          {/* Slot Counter */}
          <div className="bg-slate-900 rounded-[32px] p-10 mb-12 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-white/20 to-rose-500" />
             <p className="text-xs font-black text-rose-500 tracking-[0.4em] uppercase mb-4">Tersisa</p>
             <div className="flex items-center justify-center gap-4">
                <span className="text-8xl md:text-[10rem] font-black text-white leading-none">3</span>
                <span className="text-4xl md:text-6xl font-black text-rose-500 uppercase tracking-tighter">Slot!</span>
             </div>
             <p className="text-slate-500 text-xs font-bold mt-4 uppercase tracking-[0.2em]">Pendaftaran Terakhir Hari Ini</p>
          </div>

          {/* Timer */}
          <div className="flex justify-center gap-4 mb-12">
            {[
              { label: "JAM", value: timeLeft.hours },
              { label: "MENIT", value: timeLeft.minutes },
              { label: "DETIK", value: timeLeft.seconds },
            ].map((unit, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-20 h-24 md:w-28 md:h-32 bg-slate-50 rounded-3xl border-2 border-slate-100 flex items-center justify-center shadow-inner">
                  <p className="text-4xl md:text-6xl font-black text-slate-900 tabular-nums">{pad(unit.value)}</p>
                </div>
                <p className="text-[10px] font-black text-slate-400 mt-3 tracking-widest">{unit.label}</p>
              </div>
            ))}
          </div>

          {/* Price Preview */}
          <div className="mb-12">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Harga promo khusus</p>
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl text-slate-300 font-black line-through mb-1">Rp 599.000</span>
              <span className="text-7xl md:text-8xl font-black text-emerald-600 tracking-tighter">199rb</span>
            </div>
          </div>

          {/* Warnings */}
          <div className="space-y-4 max-w-2xl mx-auto mb-14 text-left">
            {[
              "Pendaftaran ini terbatas HANYA UNTUK 20 ORANG SETIAP Periode!",
              "Kami tidak menjamin harga tidak semakin naik karena Permintaan meningkat.",
              "Kami tidak menjamin bonus tetap ada dihari esok."
            ].map((warn, i) => (
              <div key={i} className="flex items-start gap-4 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0" />
                <p className="text-sm md:text-base font-black text-rose-900 uppercase leading-tight tracking-tight">
                  {warn}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={scrollToPricing}
            className="w-full relative overflow-hidden group bg-slate-900 text-white rounded-[32px] py-6 md:py-8 px-10 font-black text-xl md:text-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] hover:shadow-[0_48px_80px_-12px_rgba(0,0,0,0.4)] transition-all active:scale-95 group"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <span className="relative z-10 flex items-center justify-center gap-4">
                KLAIM PROMO SEKARANG
                <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
             </span>
          </button>
        </motion.div>
      </Container>
    </section>
  );
}
