// src/components/debt/StrategySelector.tsx
"use client";

import { motion } from "framer-motion";
import { Mountain, Target, Settings, Check, X } from "lucide-react";
import type { PayoffStrategy } from "@/types";
import { cn } from "@/lib/cn";

interface StrategySelectorProps {
  selected: PayoffStrategy;
  onSelect: (s: PayoffStrategy) => void;
  recommended?: PayoffStrategy;
}

interface StrategyCard {
  id: PayoffStrategy;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  tagline: string;
  description: string;
  pros: string[];
  cons: string[];
  suitableFor: string;
  color: string;
  iconColor: string;
}

const strategies: StrategyCard[] = [
  {
    id: "snowball",
    icon: Mountain,
    title: "Metode Snowball",
    tagline: "Lunasi terkecil dulu",
    description:
      "Bayar minimum semua, ekstra ke hutang TERKECIL. Motivasi tinggi karena cepat ada quick win.",
    pros: ["Motivasi tinggi", "Quick win psikologis", "Momentum terbangun"],
    cons: ["Total bunga sedikit lebih besar"],
    suitableFor: "Anda butuh motivasi kuat untuk tetap konsisten",
    color: "emerald",
    iconColor: "text-emerald-400",
  },
  {
    id: "avalanche",
    icon: Target,
    title: "Metode Avalanche",
    tagline: "Bunga tertinggi dulu",
    description:
      "Bayar minimum semua, ekstra ke hutang dengan BUNGA TERTINGGI. Hemat maksimal secara matematika.",
    pros: ["Hemat bunga terbanyak", "Lunas lebih cepat", "Optimal secara finansial"],
    cons: ["Butuh disiplin karena hasil awal lambat"],
    suitableFor: "Anda focused, disiplin, dan ingin hemat maksimal",
    color: "blue",
    iconColor: "text-blue-400",
  },
  {
    id: "custom",
    icon: Settings,
    title: "Urutan Custom",
    tagline: "Atur sendiri prioritas",
    description:
      "Anda tentukan urutan pelunasan berdasarkan pertimbangan pribadi (hubungan, emosional, dll).",
    pros: ["Fleksibel sesuai kondisi", "Pertimbangan non-finansial"],
    cons: ["Mungkin tidak optimal secara bunga"],
    suitableFor: "Kasus khusus dengan pertimbangan di luar angka",
    color: "slate",
    iconColor: "text-slate-400",
  },
];

export function StrategySelector({
  selected,
  onSelect,
  recommended,
}: StrategySelectorProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h2 className="text-lg font-bold text-white">Pilih Strategi Pelunasan</h2>
        <p className="text-sm text-slate-400 mt-1">
          Setiap strategi punya kelebihan berbeda — pilih yang sesuai karakter Anda
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((s) => {
          const Icon = s.icon;
          const isSelected = selected === s.id;
          const isRecommended = recommended === s.id;

          return (
            <motion.button
              key={s.id}
              onClick={() => onSelect(s.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative text-left p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                  : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
              )}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-2 left-4">
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-black rounded-full">
                    REKOMENDASI
                  </span>
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}

              <Icon size={28} className={cn("mb-3", s.iconColor)} />
              <h3 className="font-bold text-white text-sm">{s.title}</h3>
              <p className="text-xs text-emerald-400 font-medium mt-0.5 mb-2">{s.tagline}</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{s.description}</p>

              {/* Pros */}
              <div className="flex flex-col gap-1 mb-2">
                {s.pros.map((pro) => (
                  <div key={pro} className="flex items-center gap-1.5">
                    <Check size={11} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-slate-300">{pro}</span>
                  </div>
                ))}
              </div>

              {/* Cons */}
              {s.cons.map((con) => (
                <div key={con} className="flex items-center gap-1.5 mb-2">
                  <X size={11} className="text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">{con}</span>
                </div>
              ))}

              <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/40">
                Cocok jika: <span className="text-slate-300">{s.suitableFor}</span>
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
