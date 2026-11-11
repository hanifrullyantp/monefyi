import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AlertTriangle, ShieldAlert, Cpu, Share2, Globe, ArrowRight } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";

export const OverlayUI60s: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isReels = height > width;

  // 4 Narrative Phases:
  // Phase 1 (0 - 555): Jebakan Omset Semu
  // Phase 2 (555 - 1170): Biaya Gaib & Laser Scanner
  // Phase 3 (1170 - 1746): Solusi Monefyi Estimator
  // Phase 4 (1746 - 2070): PDF Resmi + TTD Digital & CTA
  const phase = frame < 555 ? 1 : frame < 1170 ? 2 : frame < 1746 ? 3 : 4;

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between items-center text-slate-900 pointer-events-none select-none z-30 ${
        isReels ? "pt-16 pb-28 px-6" : "pt-12 pb-20 px-10"
      }`}
    >
      {/* Top Header Bar in Clean White Frosted Glass */}
      <div className="w-full flex justify-between items-center bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-3xl border border-slate-200/80 shadow-md">
        <BrandLockup size={isReels ? 42 : 36} />
        <div
          className={`px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-2 border shadow-sm ${
            phase <= 2
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-300 text-emerald-800"
          }`}
        >
          {phase === 1 && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />}
          {phase === 2 && <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />}
          {phase === 3 && <Cpu className="w-3.5 h-3.5 text-emerald-600" />}
          {phase === 4 && <Share2 className="w-3.5 h-3.5 text-emerald-600" />}

          <span>
            {phase === 1 && "ANATOMI ESTIMASI KONTRAKTOR"}
            {phase === 2 && "X-RAY KEBOCORAN BIAYA PROYEK"}
            {phase === 3 && "PRESISI DIGITAL MONEFYI ESTIMATOR"}
            {phase === 4 && "DOKUMEN RESMI OTOMATIS"}
          </span>
        </div>
      </div>

      {/* Dynamic Titles at Top with High-Contrast Dark Text */}
      <div className="w-full text-center mt-3 max-w-[960px]">
        {phase === 1 && (
          <div className="space-y-1">
            <h1
              className={`font-black tracking-tight text-slate-900 leading-tight ${
                isReels ? "text-4xl sm:text-5xl" : "text-4xl"
              }`}
            >
              ORDERAN RAMAI...
            </h1>
            <h2
              className={`font-black tracking-tight text-rose-600 leading-tight ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
            >
              REKENING TETAP KERING?
            </h2>
            <div className="inline-block bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full shadow-sm mt-1">
              ⚠️ Hitungan masih pakai insting & coretan kertas rawan meleset!
            </div>
          </div>
        )}

        {phase === 2 && (
          <div className="space-y-1">
            <div className="inline-block bg-rose-50 border border-rose-300 text-rose-700 text-xs font-black px-3.5 py-1 rounded-full uppercase shadow-sm">
              X-RAY BIAYA GAIB DI LAPANGAN
            </div>
            <h2
              className={`font-black tracking-tight text-rose-600 leading-tight ${
                isReels ? "text-4xl sm:text-5xl" : "text-4xl"
              }`}
            >
              MEMAKAN HABIS MARGINMU!
            </h2>
            <div className="inline-block bg-white/90 backdrop-blur-sm border border-slate-200 text-amber-700 text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
              Baut, lem, ongkir, upah lembur molor... Masih untung atau malah nombok?
            </div>
          </div>
        )}

        {phase === 3 && (
          <div className="space-y-1">
            <div className="inline-block bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black px-4 py-1 rounded-full uppercase shadow-sm">
              ⚡ KALKULASI REALTIME 3D
            </div>
            <h1
              className={`font-black tracking-tight text-slate-900 leading-tight ${
                isReels ? "text-4xl sm:text-5xl" : "text-4xl"
              }`}
            >
              KETIK UKURAN,
            </h1>
            <h2
              className={`font-black tracking-tight text-emerald-700 leading-tight ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
            >
              LABA & BAHAN TERKUNCI!
            </h2>
            <div className="inline-block bg-white/90 backdrop-blur-sm border border-slate-200 text-emerald-700 text-xs sm:text-sm font-bold px-4 py-1 rounded-full shadow-sm">
              ✓ Margin 36% & Batas Diskon Otomatis Aman
            </div>
          </div>
        )}

        {phase === 4 && (
          <div className="space-y-2">
            <h1
              className={`font-black tracking-tight text-slate-900 leading-tight ${
                isReels ? "text-4xl sm:text-5xl" : "text-4xl"
              }`}
            >
              SURAT PENAWARAN RESMI
            </h1>
            <h2
              className={`font-black tracking-tight text-emerald-700 leading-tight ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
            >
              PDF + TANDA TANGAN DIGITAL!
            </h2>

            {/* Glowing CTA Button in Emerald */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-7 py-3 rounded-2xl shadow-xl mt-2 cursor-pointer">
              <Globe className="w-5 h-5 text-emerald-200" />
              <span className="text-xl font-black font-mono tracking-tight">estimator.monefyi.com</span>
              <div className="w-7 h-7 rounded-full bg-white text-emerald-800 flex items-center justify-center font-black shadow">
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="h-10" />
    </div>
  );
};
