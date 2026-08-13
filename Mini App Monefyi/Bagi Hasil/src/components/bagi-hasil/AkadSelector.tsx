"use client";

import { motion } from "framer-motion";
import { Users, GitMerge, Wheat, Sprout, TreePine } from "lucide-react";
import type { JenisAkad } from "@/types/bagi-hasil";
import { cn } from "@/lib/cn";

interface AkadSelectorProps {
  activeAkad: JenisAkad;
  onSelect: (akad: JenisAkad) => void;
}

const akadList = [
  {
    id: "mudharabah" as JenisAkad,
    nama: "Mudharabah",
    namaArab: "المضاربة",
    deskripsi: "Modal penuh dari satu pihak, dikelola pihak lain",
    cocokUntuk: "Investor + Pengusaha",
    icon: Users,
    color: "green" as const,
  },
  {
    id: "musyarakah" as JenisAkad,
    nama: "Musyarakah",
    namaArab: "المشاركة",
    deskripsi: "Modal bersama dari dua pihak atau lebih",
    cocokUntuk: "Mitra Usaha",
    icon: GitMerge,
    color: "blue" as const,
  },
  {
    id: "muzaraah" as JenisAkad,
    nama: "Muzara'ah",
    namaArab: "المزارعة",
    deskripsi: "Lahan & benih dari pemilik, tenaga dari penggarap",
    cocokUntuk: "Pertanian — Benih dari Pemilik",
    icon: Wheat,
    color: "amber" as const,
  },
  {
    id: "mukhabarah" as JenisAkad,
    nama: "Mukhabarah",
    namaArab: "المخابرة",
    deskripsi: "Lahan dari pemilik, benih & tenaga dari penggarap",
    cocokUntuk: "Pertanian — Benih dari Penggarap",
    icon: Sprout,
    color: "emerald" as const,
  },
  {
    id: "musaqah" as JenisAkad,
    nama: "Musaqah",
    namaArab: "المساقاة",
    deskripsi: "Perawatan tanaman yang sudah ada",
    cocokUntuk: "Kebun / Tanaman Produktif",
    icon: TreePine,
    color: "teal" as const,
  },
];

const colorMap = {
  green: {
    active: "border-green-500 bg-green-900/20",
    icon: "bg-green-900/40 text-green-400",
    badge: "bg-green-900/40 text-green-400",
    arab: "text-green-600",
    ring: "ring-2 ring-green-500/30",
  },
  blue: {
    active: "border-blue-500 bg-blue-900/20",
    icon: "bg-blue-900/40 text-blue-400",
    badge: "bg-blue-900/40 text-blue-400",
    arab: "text-blue-600",
    ring: "ring-2 ring-blue-500/30",
  },
  amber: {
    active: "border-amber-500 bg-amber-900/20",
    icon: "bg-amber-900/40 text-amber-400",
    badge: "bg-amber-900/40 text-amber-400",
    arab: "text-amber-600",
    ring: "ring-2 ring-amber-500/30",
  },
  emerald: {
    active: "border-emerald-500 bg-emerald-900/20",
    icon: "bg-emerald-900/40 text-emerald-400",
    badge: "bg-emerald-900/40 text-emerald-400",
    arab: "text-emerald-600",
    ring: "ring-2 ring-emerald-500/30",
  },
  teal: {
    active: "border-teal-500 bg-teal-900/20",
    icon: "bg-teal-900/40 text-teal-400",
    badge: "bg-teal-900/40 text-teal-400",
    arab: "text-teal-600",
    ring: "ring-2 ring-teal-500/30",
  },
};

export default function AkadSelector({
  activeAkad,
  onSelect,
}: AkadSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-100">Pilih Jenis Akad</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pilih jenis akad bagi hasil yang sesuai dengan situasi kemitraan Anda
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {akadList.map((akad) => {
          const isActive = activeAkad === akad.id;
          const colors = colorMap[akad.color];
          const Icon = akad.icon;

          return (
            <motion.button
              key={akad.id}
              onClick={() => onSelect(akad.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                isActive
                  ? `${colors.active} ${colors.ring}`
                  : "border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-800/80"
              )}
              aria-pressed={isActive}
              aria-label={`Pilih akad ${akad.nama}`}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  isActive ? colors.icon : "bg-slate-700 text-slate-400"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-slate-100">
                    {akad.nama}
                  </p>
                  <p
                    lang="ar"
                    className={cn(
                      "font-amiri text-sm transition-colors",
                      isActive ? colors.arab : "text-slate-600"
                    )}
                  >
                    {akad.namaArab}
                  </p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {akad.deskripsi}
                </p>
              </div>

              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                  isActive ? colors.badge : "bg-slate-700/50 text-slate-500"
                )}
              >
                {akad.cocokUntuk}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
