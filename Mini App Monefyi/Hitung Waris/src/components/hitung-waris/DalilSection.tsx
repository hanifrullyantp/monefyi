"use client";

import { motion } from "framer-motion";
import { BookMarked } from "lucide-react";
import type { HasilAhliWaris } from "@/types/hitung-waris";
import { DALIL_WARIS, type DalilItem } from "@/lib/dalil-waris-data";
import { cn } from "@/lib/cn";

interface DalilSectionProps {
  hasilPerAhliWaris?: HasilAhliWaris[];
}

function DalilCard({ dalil, index }: { dalil: DalilItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
        borderLeft: "3px solid #3b82f6",
      }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold",
                dalil.jenis === "quran"
                  ? "bg-green-900/50 text-green-400 border border-green-700/50"
                  : "bg-blue-900/50 text-blue-400 border border-blue-700/50"
              )}
            >
              {dalil.jenis === "quran" ? "Al-Qur'an" : "Hadits"}
            </span>
            <span className="text-sm font-bold text-blue-400">
              {dalil.referensi}
            </span>
          </div>
        </div>

        {/* Teks Arab */}
        <div className="mb-4 p-4 rounded-xl bg-slate-900/50">
          <p
            lang="ar"
            dir="rtl"
            className="text-xl font-amiri text-right text-blue-100 leading-loose"
          >
            {dalil.arabText}
          </p>
        </div>

        {/* Terjemahan */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Terjemahan
          </p>
          <p className="text-sm italic text-slate-300 leading-relaxed">
            &ldquo;{dalil.terjemahan}&rdquo;
          </p>
        </div>

        {/* Relevansi */}
        <div className="pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-400">
            <span className="text-blue-400 font-semibold">Relevansi: </span>
            {dalil.relevansi}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function DalilSection({ hasilPerAhliWaris }: DalilSectionProps) {
  // Filter dalil yang relevan
  const dalilRelevan = DALIL_WARIS.filter((dalil) => {
    // Selalu tampilkan dalil umum (tidak spesifik ke jenis ahli waris)
    if (!dalil.relevanUntuk) return true;
    // Tampilkan jika ada ahli waris yang relevan dalam hasil
    if (!hasilPerAhliWaris) return false;
    return dalil.relevanUntuk.some((jenis) =>
      hasilPerAhliWaris.some((h) => h.jenis === jenis)
    );
  });

  const dalilUtama = dalilRelevan.filter((d) => d.jenis === "quran");
  const dalilHadits = dalilRelevan.filter((d) => d.jenis === "hadits");

  return (
    <section id="dalil" className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookMarked className="w-6 h-6 text-blue-400" />
          <h2 className="text-3xl font-bold text-white">
            Dalil Pembagian Waris dalam Islam
          </h2>
        </div>
        <p className="text-slate-400 max-w-xl mx-auto">
          Berdasarkan Al-Qur&apos;an dan Sunnah Nabi ﷺ
        </p>
      </motion.div>

      {/* Ayat Al-Qur'an */}
      {dalilUtama.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-green-500" />
            Ayat Al-Qur&apos;an
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            {dalilUtama.map((dalil, i) => (
              <DalilCard key={dalil.id} dalil={dalil} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Hadits */}
      {dalilHadits.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-blue-500" />
            Hadits Nabi ﷺ
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            {dalilHadits.map((dalil, i) => (
              <DalilCard key={dalil.id} dalil={dalil} index={i} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
