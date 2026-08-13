"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Info, ExternalLink } from "lucide-react";
import type { KategoriItem } from "@/types/budget-planner";
import { formatCurrency } from "@/lib/formatters";

interface IslamiSectionProps {
  sedekahKategori: KategoriItem | undefined;
  penghasilan: number;
}

export function IslamiSection({
  sedekahKategori,
  penghasilan,
}: IslamiSectionProps) {
  if (!sedekahKategori) return null;

  const zakatEstimasi = penghasilan * 0.025;
  const infaqSunnah = sedekahKategori.rupiahAlokasi * 0.4;
  const sedekahLain =
    sedekahKategori.rupiahAlokasi - zakatEstimasi - infaqSunnah;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-700/40 bg-amber-900/10 p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-900/40 border border-amber-700/40 flex items-center justify-center">
          <Heart size={18} className="text-amber-400" />
        </div>
        <div>
          <p className="font-semibold text-white">Komponen Sedekah & Zakat</p>
          <p className="text-xs text-slate-400">
            Alokasi {formatCurrency(sedekahKategori.rupiahAlokasi)} (10% penghasilan)
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        {[
          {
            label: "Estimasi Zakat Penghasilan (2.5%)",
            rupiah: zakatEstimasi,
            note: "Wajib jika mencapai nisab",
            color: "#f59e0b",
          },
          {
            label: "Infaq Sunnah",
            rupiah: Math.max(0, infaqSunnah),
            note: "Sunnah muakkad",
            color: "#fbbf24",
          },
          {
            label: "Sedekah & Lainnya",
            rupiah: Math.max(0, sedekahLain),
            note: "Sedekah lainnya, wakaf, dll",
            color: "#d97706",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
          >
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-[10px] text-slate-500">{item.note}</p>
            </div>
            <p
              className="font-bold tabular-nums text-sm"
              style={{ color: item.color }}
            >
              {formatCurrency(Math.round(item.rupiah))}
            </p>
          </div>
        ))}
      </div>

      {/* Catatan */}
      <div className="flex items-start gap-2 p-3 rounded-xl border border-blue-800/30 bg-blue-900/10">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-xs text-slate-300 leading-relaxed">
            Zakat penghasilan wajib jika gaji tahunan Anda ≥ nisab (setara 85
            gram emas). Estimasi di atas adalah 2.5% dari penghasilan bulanan
            dan bukan perhitungan resmi.
          </p>
          <Link
            href="/kalkulator-zakat"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Hitung Zakat Saya
            <ExternalLink size={10} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
