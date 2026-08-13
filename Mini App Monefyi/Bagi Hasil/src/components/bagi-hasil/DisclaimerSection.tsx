"use client";

import { AlertTriangle, Scale, Users, FileText } from "lucide-react";

export default function DisclaimerSection() {
  return (
    <section className="rounded-2xl border border-amber-900/30 bg-amber-950/20 p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <h3 className="text-base font-semibold text-amber-300">
            Perhatian & Disclaimer
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Baca sebelum menggunakan kalkulasi ini
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-1">
              Bukan Fatwa Hukum Islam
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hasil kalkulasi ini adalah simulasi matematis dan bukan merupakan
              fatwa hukum Islam. Untuk kepastian hukum, konsultasikan dengan
              ulama atau ahli fiqh muamalah.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-1">
              Konsultasi Profesional Diperlukan
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sebelum mengikatkan diri dalam akad bagi hasil, konsultasikan
              dengan ulama, notaris, atau konsultan hukum syariah untuk
              memastikan keabsahan akad Anda.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-1">
              Dokumentasikan Akad Secara Tertulis
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sesuai perintah Allah dalam QS. Al-Baqarah: 282, akad bagi hasil
              sebaiknya didokumentasikan secara tertulis, disetujui, dan
              disaksikan oleh pihak yang dipercaya.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-1">
              Hasil Bersifat Estimasi
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Semua angka yang dihasilkan adalah proyeksi berdasarkan input yang
              Anda masukkan. Hasil aktual di lapangan dapat berbeda
              berdasarkan kondisi pasar, iklim, dan faktor lainnya.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-amber-900/30 pt-4">
        <p className="text-xs text-slate-500 italic text-center">
          Kalkulator Bagi Hasil Islami — Monefyi &copy; {new Date().getFullYear()}.
          Dibuat untuk memudahkan pemahaman dan perencanaan akad bagi hasil Islami.
          Bukan pengganti konsultasi dengan ahli syariah.
        </p>
      </div>
    </section>
  );
}
