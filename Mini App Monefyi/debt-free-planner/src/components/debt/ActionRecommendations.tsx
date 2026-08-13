// src/components/debt/ActionRecommendations.tsx
"use client";

import { motion } from "framer-motion";
import {
  ShieldOff, Bell, Phone, TrendingUp, BarChart3,
  RefreshCw, CreditCard,
} from "lucide-react";
import type { PayoffResult } from "@/types";
import { formatCurrency } from "@/lib/formatters";

interface ActionRecommendationsProps {
  result: PayoffResult;
  monthlyAllocation: number;
}

interface ActionCard {
  priority: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  impact?: string;
  iconColor: string;
  bgColor: string;
}

export function ActionRecommendations({
  result,
  monthlyAllocation,
}: ActionRecommendationsProps) {
  const extraPerMonth500k = 500_000;
  const impactText = result.bulanUntukLunas > 2
    ? `Bisa mempercepat ${Math.max(1, Math.round(result.bulanUntukLunas * 0.1))} bulan lebih cepat`
    : "Percepat pelunasan";

  const actions: ActionCard[] = [
    {
      priority: 1,
      icon: ShieldOff,
      title: "Stop tambah hutang baru",
      description:
        "Selama masa pelunasan, hindari cicilan baru apapun. Tunda pembelian besar, gunakan uang tunai, atau simpan dulu.",
      impact: "Mencegah spiral hutang",
      iconColor: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      priority: 2,
      icon: Bell,
      title: "Auto-debit alokasi hutang",
      description: `Setup auto-transfer ${formatCurrency(monthlyAllocation)} di tanggal gajian ke rekening khusus pembayaran hutang. Bayar hutang sebelum belanja.`,
      impact: "Konsistensi 100%",
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      priority: 3,
      icon: Phone,
      title: "Negosiasi bunga dengan bank",
      description:
        "Coba minta penurunan bunga, terutama kartu kredit. Ceritakan kondisi keuangan dan komitmen bayar. Sekitar 30% aplikasi berhasil.",
      impact: "Potensi hemat besar",
      iconColor: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      priority: 4,
      icon: TrendingUp,
      title: "Cari tambahan income",
      description: `Ekstra ${formatCurrency(extraPerMonth500k)}/bulan bisa mempercepat pelunasan signifikan. Freelance, jual barang tak terpakai, atau side hustle kecil.`,
      impact: impactText,
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      priority: 5,
      icon: CreditCard,
      title: "Bekukan kartu kredit",
      description:
        "Secara harfiah: simpan kartu kredit di laci atau titip ke orang terpercaya. Bayar dengan debit/cash untuk hindari gesek impulsif.",
      impact: "Hindari hutang baru",
      iconColor: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      priority: 6,
      icon: BarChart3,
      title: "Track progress mingguan",
      description:
        "Setiap Minggu, buka planner ini dan lihat sisa hutang berkurang. Momentum visual adalah bahan bakar semangat terkuat.",
      impact: "Disiplin jangka panjang",
      iconColor: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      priority: 7,
      icon: RefreshCw,
      title: "Pertimbangkan konsolidasi hutang",
      description:
        "Jika punya banyak hutang berbunga tinggi, konsolidasi ke KTA berbunga lebih rendah bisa menghemat signifikan. Konsultasikan ke bank.",
      impact: "Sederhanakan pembayaran",
      iconColor: "text-slate-400",
      bgColor: "bg-slate-500/10",
    },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h3 className="text-base font-bold text-white">Yang Harus Anda Lakukan</h3>
        <p className="text-sm text-slate-400 mt-1">
          Langkah konkret untuk mempercepat perjalanan bebas hutang
        </p>
      </div>

      <div className="p-6 flex flex-col gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.priority}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors"
            >
              {/* Priority */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-300">{action.priority}</span>
              </div>

              {/* Icon */}
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-xl ${action.bgColor} border border-white/10 flex items-center justify-center`}
              >
                <Icon size={18} className={action.iconColor} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-1">{action.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
                {action.impact && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Impact: {action.impact}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
