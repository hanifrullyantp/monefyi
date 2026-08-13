"use client";

import type { SkenarioResult } from "@/types/bagi-hasil";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface SkenarioTableProps {
  skenario: SkenarioResult[];
  isPertanian?: boolean;
}

const rowStyle: Record<string, string> = {
  "🟢 Optimis": "bg-green-950/30 border-green-900/30",
  "⚪ Moderat": "bg-slate-800/30 border-slate-700/30",
  "🔴 Pesimis": "bg-red-950/30 border-red-900/30",
  "🌾 Panen Melimpah": "bg-green-950/30 border-green-900/30",
  "🌱 Panen Normal": "bg-slate-800/30 border-slate-700/30",
  "🌧 Panen Buruk": "bg-amber-950/30 border-amber-900/30",
  "❌ Gagal Panen": "bg-red-950/30 border-red-900/30",
};

const totalStyle: Record<string, string> = {
  "🟢 Optimis": "text-green-400",
  "⚪ Moderat": "text-slate-300",
  "🔴 Pesimis": "text-red-400",
  "🌾 Panen Melimpah": "text-green-400",
  "🌱 Panen Normal": "text-slate-300",
  "🌧 Panen Buruk": "text-amber-400",
  "❌ Gagal Panen": "text-red-400",
};

export default function SkenarioTable({
  skenario,
  isPertanian = false,
}: SkenarioTableProps) {
  if (!skenario.length) return null;

  const pihakNames =
    skenario[0]?.pembagianPerPihak.map((p) => p.nama) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-400">
        {isPertanian ? "Simulasi Skenario Panen" : "Simulasi 3 Skenario"}
      </p>

      {/* Overflow for mobile */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                Skenario
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                Total Nilai
              </th>
              {pihakNames.map((nama) => (
                <th
                  key={nama}
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-400"
                >
                  {nama}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skenario.map((s, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-slate-700/50 transition-colors",
                  rowStyle[s.label] ?? "bg-slate-800/30"
                )}
              >
                <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">
                  {s.label}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-tabular font-bold whitespace-nowrap",
                    totalStyle[s.label] ?? "text-slate-300"
                  )}
                >
                  {formatCurrency(s.totalNilai)}
                </td>
                {s.pembagianPerPihak.map((p) => (
                  <td
                    key={p.nama}
                    className={cn(
                      "px-4 py-3 text-right font-tabular whitespace-nowrap",
                      totalStyle[s.label] ?? "text-slate-300"
                    )}
                  >
                    {formatCurrency(p.nilai)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 italic">
        * Skenario adalah simulasi. Hasil aktual dapat berbeda dari proyeksi ini.
      </p>
    </div>
  );
}
