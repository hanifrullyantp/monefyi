"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { JenisAkad } from "@/types/bagi-hasil";
import { cn } from "@/lib/cn";

interface KomparatorAkadProps {
  activeAkad: JenisAkad;
  onSelect: (akad: JenisAkad) => void;
}

const rows = [
  {
    id: "mudharabah" as JenisAkad,
    nama: "Mudharabah",
    namaArab: "المضاربة",
    modal: "Shahibul Mal (100%)",
    tenaga: "Mudharib (100%)",
    keuntungan: "Sesuai nisbah yang disepakati",
    kerugian: "Finansial: Shahibul Mal. Tenaga: Mudharib.",
    cocokUntuk: "Investor + Pengusaha tanpa modal",
    highlight: "green",
  },
  {
    id: "musyarakah" as JenisAkad,
    nama: "Musyarakah",
    namaArab: "المشاركة",
    modal: "Semua pihak (proporsional)",
    tenaga: "Semua pihak",
    keuntungan: "Sesuai nisbah (boleh beda dari modal)",
    kerugian: "Proporsional terhadap modal (wajib)",
    cocokUntuk: "Dua mitra usaha atau lebih",
    highlight: "blue",
  },
  {
    id: "muzaraah" as JenisAkad,
    nama: "Muzara'ah",
    namaArab: "المزارعة",
    modal: "Pemilik lahan + benih",
    tenaga: "Penggarap",
    keuntungan: "Persentase dari hasil panen",
    kerugian: "Proporsional sesuai nisbah",
    cocokUntuk: "Lahan + benih dari pemilik",
    highlight: "amber",
  },
  {
    id: "mukhabarah" as JenisAkad,
    nama: "Mukhabarah",
    namaArab: "المخابرة",
    modal: "Pemilik lahan (tanpa benih)",
    tenaga: "Penggarap + benih",
    keuntungan: "Persentase dari hasil panen",
    kerugian: "Proporsional sesuai nisbah",
    cocokUntuk: "Lahan dari pemilik, benih dari penggarap",
    highlight: "emerald",
  },
  {
    id: "musaqah" as JenisAkad,
    nama: "Musaqah",
    namaArab: "المساقاة",
    modal: "Pemilik kebun (tanaman sudah ada)",
    tenaga: "Pengelola/Perawat",
    keuntungan: "Persentase dari hasil panen",
    kerugian: "Proporsional sesuai nisbah",
    cocokUntuk: "Kebun/tanaman produktif yang sudah ada",
    highlight: "teal",
  },
];

const highlightMap: Record<string, string> = {
  green: "border-green-500/50 bg-green-900/10",
  blue: "border-blue-500/50 bg-blue-900/10",
  amber: "border-amber-500/50 bg-amber-900/10",
  emerald: "border-emerald-500/50 bg-emerald-900/10",
  teal: "border-teal-500/50 bg-teal-900/10",
};

const textMap: Record<string, string> = {
  green: "text-green-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  teal: "text-teal-400",
};

export default function KomparatorAkad({ activeAkad, onSelect }: KomparatorAkadProps) {
  return (
    <div className="space-y-4" id="komparator-akad">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">
          Komparator Akad Bagi Hasil
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Bandingkan semua jenis akad untuk menemukan yang paling sesuai
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 min-w-[120px]">Akad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 min-w-[160px]">Sediakan Modal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 min-w-[160px]">Sediakan Tenaga</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 min-w-[180px]">Pembagian Keuntungan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 min-w-[180px]">Pembagian Kerugian</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 min-w-[160px]">Cocok Untuk</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Pilih</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isActive = activeAkad === row.id;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-slate-700/50 transition-all",
                    isActive
                      ? highlightMap[row.highlight]
                      : "hover:bg-slate-800/30"
                  )}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p
                        className={cn(
                          "font-semibold",
                          isActive ? textMap[row.highlight] : "text-slate-200"
                        )}
                      >
                        {row.nama}
                      </p>
                      <p lang="ar" className="font-amiri text-xs text-slate-600">
                        {row.namaArab}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{row.modal}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{row.tenaga}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{row.keuntungan}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{row.kerugian}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{row.cocokUntuk}</td>
                  <td className="px-4 py-3">
                    <motion.button
                      onClick={() => onSelect(row.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? `${textMap[row.highlight]} bg-slate-700/50`
                          : "text-slate-400 hover:text-green-400 hover:bg-slate-700/50"
                      )}
                      aria-label={`Pilih akad ${row.nama}`}
                    >
                      {isActive ? "Aktif" : "Pilih"}
                      {!isActive && <ArrowRight className="h-3 w-3" />}
                    </motion.button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
