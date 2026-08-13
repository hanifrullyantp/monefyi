"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Info } from "lucide-react";
import type { DalilItem, JenisAkad } from "@/types/bagi-hasil";
import { getDalilForAkad } from "@/lib/dalil-data";
import { cn } from "@/lib/cn";

interface DalilCardProps {
  activeAkad: JenisAkad;
}

function SingleDalil({ dalil }: { dalil: DalilItem }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-l-[3px] border-blue-500 bg-gradient-dalil p-5 shadow-lg">
      <div className="absolute right-4 top-4 opacity-20">
        <BookOpen className="h-8 w-8 text-blue-300" />
      </div>

      {/* Badge */}
      <span
        className={cn(
          "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
          dalil.jenis === "quran"
            ? "bg-blue-900/60 text-blue-300"
            : "bg-slate-700/60 text-slate-300"
        )}
      >
        {dalil.jenis === "quran" ? "📖 Al-Qur'an" : "📜 Hadits"}
      </span>

      {/* Referensi */}
      <p className="mt-2 text-sm font-semibold text-blue-400">
        {dalil.referensi}
      </p>

      {/* Teks Arab */}
      <p
        lang="ar"
        dir="rtl"
        className="mt-3 font-amiri text-xl leading-relaxed text-blue-100 text-right"
      >
        {dalil.teksArab}
      </p>

      {/* Terjemahan */}
      <p className="mt-3 text-sm italic text-slate-300 leading-relaxed">
        &ldquo;{dalil.terjemahan}&rdquo;
      </p>

      {/* Relevansi */}
      <div className="mt-3 flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
        <p className="text-xs text-slate-400 leading-relaxed">{dalil.relevansi}</p>
      </div>
    </div>
  );
}

export default function DalilCard({ activeAkad }: DalilCardProps) {
  const dalilList = getDalilForAkad(activeAkad);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">
          Landasan Dalil Syari&apos;ah
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Dasar hukum Al-Qur&apos;an dan Sunnah untuk akad yang Anda pilih
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeAkad}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
          className="grid gap-4 md:grid-cols-2"
        >
          {dalilList.map((dalil, i) => (
            <motion.div
              key={`${activeAkad}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <SingleDalil dalil={dalil} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
