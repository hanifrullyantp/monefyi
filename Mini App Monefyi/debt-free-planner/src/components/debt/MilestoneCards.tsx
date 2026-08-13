// src/components/debt/MilestoneCards.tsx
"use client";

import { motion } from "framer-motion";
import { Star, TrendingDown, Trophy, Zap, Award, PartyPopper } from "lucide-react";
import type { PayoffResult } from "@/types";
import { cn } from "@/lib/cn";

interface MilestoneCardsProps {
  result: PayoffResult;
}

interface MilestoneData {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  detail: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  isSpecial?: boolean;
}

export function MilestoneCards({ result }: MilestoneCardsProps) {
  const { jadwal, urutanPelunasan, tanggalLunas, bulanUntukLunas, totalHutangAwal } = result;

  // Find first debt lunas
  const firstLunasMonth = jadwal.find((m) => m.hutangLunasBulanIni.length > 0);
  const firstLunasName = firstLunasMonth?.hutangLunasBulanIni[0] ?? "Hutang pertama";

  // 50% hutang lunas
  const halfwayMonth = jadwal.find(
    (m) => m.totalSisaHutang <= totalHutangAwal / 2
  );

  // Hutang terbesar (last in urutan for avalanche or largest)
  const lastDebtLunas = urutanPelunasan[urutanPelunasan.length - 1] ?? "Hutang terbesar";
  const lastLunasMonth = jadwal.find((m) =>
    m.hutangLunasBulanIni.includes(lastDebtLunas)
  );

  // 3 debts lunas
  const thirdLunasMonth = jadwal.find((m) => {
    const cumLunas = jadwal
      .filter((x) => x.bulanKe <= m.bulanKe)
      .flatMap((x) => x.hutangLunasBulanIni).length;
    return cumLunas >= 3;
  });

  const milestones: MilestoneData[] = [
    {
      id: "first",
      icon: Star,
      title: "Hutang Pertama Lunas",
      description: firstLunasMonth
        ? `${firstLunasMonth.tanggal}`
        : `Bulan ${bulanUntukLunas > 12 ? "~1" : bulanUntukLunas}`,
      detail: `${firstLunasName} lunas!`,
      colorClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/30",
    },
    {
      id: "halfway",
      icon: TrendingDown,
      title: "50% Hutang Lunas",
      description: halfwayMonth
        ? halfwayMonth.tanggal
        : `Bulan ${Math.round(bulanUntukLunas * 0.6)}`,
      detail: "Setengah perjalanan selesai",
      colorClass: "text-orange-400",
      bgClass: "bg-orange-500/10",
      borderClass: "border-orange-500/30",
    },
    {
      id: "biggest",
      icon: Trophy,
      title: "Hutang Terbesar Lunas",
      description: lastLunasMonth
        ? lastLunasMonth.tanggal
        : `Bulan ${Math.round(bulanUntukLunas * 0.8)}`,
      detail: lastDebtLunas,
      colorClass: "text-yellow-400",
      bgClass: "bg-yellow-500/10",
      borderClass: "border-yellow-500/30",
    },
    {
      id: "momentum",
      icon: Zap,
      title: "Momentum Kuat",
      description: thirdLunasMonth
        ? thirdLunasMonth.tanggal
        : urutanPelunasan.length >= 3
        ? "Dalam rencana"
        : "Tambah lebih banyak hutang",
      detail: urutanPelunasan.length >= 3 ? "3 hutang berturut lunas!" : "Butuh min. 3 hutang",
      colorClass: "text-emerald-400",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/30",
    },
    {
      id: "interest-free",
      icon: Award,
      title: "Bunga Bebas",
      description: tanggalLunas,
      detail: "Tidak bayar bunga lagi!",
      colorClass: "text-green-400",
      bgClass: "bg-green-500/10",
      borderClass: "border-green-500/30",
    },
    {
      id: "freedom",
      icon: PartyPopper,
      title: "BEBAS HUTANG!",
      description: tanggalLunas,
      detail: `${bulanUntukLunas} bulan dari sekarang`,
      colorClass: "text-amber-300",
      bgClass: "bg-gradient-to-br from-amber-950/40 to-emerald-950/40",
      borderClass: "border-amber-400/40",
      isSpecial: true,
    },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h3 className="text-base font-bold text-white">Milestone Perjalanan Anda</h3>
        <p className="text-sm text-slate-400 mt-1">
          Perayaan kecil di setiap pencapaian penting
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestones.map((m, idx) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "p-4 rounded-2xl border transition-all",
                m.bgClass,
                m.borderClass,
                m.isSpecial && "shadow-lg shadow-amber-500/10"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                    m.bgClass,
                    "border",
                    m.borderClass
                  )}
                >
                  <Icon size={20} className={m.colorClass} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-bold text-sm",
                      m.isSpecial ? "text-amber-300" : "text-white"
                    )}
                  >
                    {m.title}
                  </p>
                  <p className={cn("text-base font-bold tabular-nums mt-0.5", m.colorClass)}>
                    {m.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{m.detail}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
