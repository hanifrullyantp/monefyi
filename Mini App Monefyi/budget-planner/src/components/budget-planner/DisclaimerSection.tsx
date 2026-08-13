"use client";

import { Info, Shield, Database } from "lucide-react";

export function DisclaimerSection() {
  return (
    <section
      className="rounded-3xl border border-slate-700/50 bg-slate-900/30 p-6 md:p-8"
      aria-label="Disclaimer dan informasi privasi"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Info size={16} />
          <h3 className="font-semibold text-sm">Catatan Penting</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3 text-xs text-slate-500">
          <div className="flex items-start gap-3">
            <Shield size={14} className="text-green-600 shrink-0 mt-0.5" />
            <p>
              <span className="text-slate-400 font-medium block mb-1">
                Privasi Anda Aman
              </span>
              Semua data tersimpan hanya di browser Anda (localStorage). Kami
              tidak mengirim atau menyimpan data ke server manapun.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Database size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <p>
              <span className="text-slate-400 font-medium block mb-1">
                Bukan Saran Keuangan Resmi
              </span>
              Alokasi yang ditampilkan adalah panduan umum berdasarkan metode
              budgeting populer. Konsultasikan dengan perencana keuangan
              bersertifikat untuk keputusan finansial penting.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p>
              <span className="text-slate-400 font-medium block mb-1">
                Estimasi Zakat
              </span>
              Perhitungan zakat yang ditampilkan hanya estimasi sederhana (2.5%
              dari penghasilan bruto). Untuk perhitungan zakat yang akurat,
              konsultasikan dengan lembaga zakat terpercaya seperti BAZNAS.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            © 2024 Monefyi. Dibuat dengan ❤️ untuk membantu Indonesia lebih
            cerdas finansial.
          </p>
          <p className="text-xs text-green-800 font-medium">
            monefyi.com/budget-planner
          </p>
        </div>
      </div>
    </section>
  );
}
