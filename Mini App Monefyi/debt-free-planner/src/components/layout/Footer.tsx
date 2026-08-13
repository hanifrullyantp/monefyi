// src/components/layout/Footer.tsx
import { Award, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Award size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Debt Freedom Planner</p>
              <p className="text-xs text-slate-500">
                Bonus Lifetime Monefyi · Versi Lite
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Data tersimpan hanya di browser Anda (localStorage).
              Tidak ada server, tidak ada database.
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Pure client-side • Zero tracking • 100% privat
            </p>
          </div>

          {/* Credit */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Dibuat dengan</span>
            <Heart size={12} className="text-red-400 fill-red-400" />
            <span>untuk kebebasan finansial Indonesia</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-slate-800/40">
          <p className="text-xs text-slate-600 text-center leading-relaxed max-w-2xl mx-auto">
            Disclaimer: Kalkulator ini memberikan estimasi berdasarkan data yang Anda input.
            Hasil aktual bisa berbeda. Konsultasikan dengan penasihat keuangan untuk keputusan besar.
            Perhitungan menggunakan model sederhana dan tidak memperhitungkan biaya-biaya tambahan.
          </p>
        </div>
      </div>
    </footer>
  );
}
