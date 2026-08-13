"use client";

import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle, Info } from "lucide-react";
import type { HasilAhliWaris } from "@/types/hitung-waris";

interface HijabPanelProps {
  hasilPerAhliWaris: HasilAhliWaris[];
}

export function HijabPanel({ hasilPerAhliWaris }: HijabPanelProps) {
  const yangTerhijab = hasilPerAhliWaris.filter(
    (h) => h.status === "terhijab_hirman"
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl border border-slate-700 bg-slate-800/50 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)" }}
        >
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">
            Ahli Waris yang Terhijab
          </h3>
          <p className="text-sm text-slate-400">
            Terhalang dari mendapat warisan
          </p>
        </div>
      </div>

      <div className="p-6">
        {yangTerhijab.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-green-700/30 bg-green-950/20">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">
              Semua ahli waris mendapat bagian dalam kasus ini. Tidak ada yang
              terhijab.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              Beberapa ahli waris tidak mendapat bagian karena terhalang
              (hijab) oleh ahli waris lain yang lebih dekat. Ini adalah
              ketentuan faraid, bukan ketidakadilan.
            </p>

            <div className="space-y-3">
              {yangTerhijab.map((h, i) => (
                <motion.div
                  key={h.jenis}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-2xl border border-red-900/40 bg-red-950/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-slate-200">
                          {h.namaDisplay}
                        </span>
                        {h.jumlahOrang > 1 && (
                          <span className="text-xs text-slate-500">
                            ({h.jumlahOrang} orang)
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-xs border border-red-800/50 text-red-400 bg-red-950/30">
                          Hijab Hirman
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {h.alasanHijab}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info box */}
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
                borderLeft: "3px solid #3b82f6",
              }}
            >
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-1">
                    Tentang Hajb dalam Faraid
                  </p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Hijab dalam faraid adalah mekanisme yang memastikan harta
                    diterima oleh yang paling dekat dan berhak. Ada dua jenis
                    hijab:
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-red-400 font-bold flex-shrink-0">✕</span>
                      <span>
                        <span className="text-red-400 font-semibold">Hijab Hirman</span>
                        : Terhalang sepenuhnya, tidak mendapat bagian sama
                        sekali.
                      </span>
                    </li>
                    <li className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold flex-shrink-0">↓</span>
                      <span>
                        <span className="text-amber-400 font-semibold">Hijab Nuqshan</span>
                        : Bagian berkurang (misalnya suami dari 1/2 ke 1/4
                        karena ada anak).
                      </span>
                    </li>
                  </ul>
                  <p className="text-xs text-slate-400 mt-2">
                    Ahli waris yang terhijab bisa mendapat nafkah dari ahli
                    waris yang mewarisinya (misalnya: nafkah anak dari ayah
                    yang mewarisi).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
