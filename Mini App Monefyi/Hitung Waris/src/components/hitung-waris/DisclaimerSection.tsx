"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink, Scale } from "lucide-react";

export function DisclaimerSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-12"
    >
      <div className="rounded-3xl overflow-hidden border border-amber-700/40 bg-amber-950/10">
        <div className="p-6 border-b border-amber-700/30 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #b45309 0%, #78350f 100%)" }}
          >
            <AlertTriangle className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-amber-200">
              Perhatian & Disclaimer Penting
            </h3>
            <p className="text-sm text-amber-500">
              Baca sebelum menggunakan hasil kalkulasi ini
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: "⚠️",
                judul: "Bukan Fatwa Resmi",
                isi: "Hasil kalkulasi ini adalah simulasi berdasarkan aturan faraid umum. Ini BUKAN fatwa resmi dari ulama atau lembaga keagamaan manapun.",
              },
              {
                icon: "📚",
                judul: "Kasus Dapat Berbeda",
                isi: "Setiap kasus waris bisa memiliki kondisi khusus yang memerlukan ijtihad. Kasus kompleks (harta bisnis, sengketa, wasiat rumit) harus dikonsultasikan.",
              },
              {
                icon: "⚖️",
                judul: "Aspek Hukum Positif",
                isi: "Pembagian waris di Indonesia juga diatur oleh Kompilasi Hukum Islam (KHI) dan Pengadilan Agama. Pastikan sesuai dengan ketentuan hukum yang berlaku.",
              },
              {
                icon: "🤝",
                judul: "Musyawarah Keluarga",
                isi: "Islam menganjurkan musyawarah dan kerelaan antar ahli waris. Pembagian dengan kerelaan semua pihak (tahallul) adalah lebih utama dan menghindari konflik.",
              },
            ].map((item) => (
              <div
                key={item.judul}
                className="p-4 rounded-2xl border border-amber-800/30 bg-amber-900/10"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-200 mb-1">
                      {item.judul}
                    </p>
                    <p className="text-xs text-amber-400/80 leading-relaxed">
                      {item.isi}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Konsultasi */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
              border: "1px solid rgba(52, 211, 153, 0.2)",
            }}
          >
            <div className="flex items-start gap-4">
              <Scale className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-base font-semibold text-green-300 mb-2">
                  Dianjurkan: Konsultasi dengan Ulama atau Pengadilan Agama
                </p>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  Untuk kepastian hukum dan keabsahan pembagian waris, sangat
                  dianjurkan untuk:
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Konsultasi dengan ulama atau mufti yang berkompeten dalam fiqih mawaris",
                    "Mengajukan permohonan ke Pengadilan Agama setempat",
                    "Meminta bantuan dari Badan Penasihatan Pembinaan dan Pelestarian Perkawinan (BP4)",
                    "Berkonsultasi dengan notaris untuk aspek hukum formal",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center">
            <p className="text-xs text-slate-600">
              Monefyi — Hitung Waris | Dibuat untuk memudahkan pemahaman Ilmu Faraid.
              Semua data diproses di browser Anda dan tidak dikirim ke server manapun.
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <ExternalLink className="w-3 h-3 text-slate-600" />
              <span className="text-xs text-slate-600">
                Berdasarkan: QS. An-Nisa: 7, 11, 12, 176 dan Hadits Sahih
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
