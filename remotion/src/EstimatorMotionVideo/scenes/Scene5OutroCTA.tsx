import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ArrowRight, CheckCircle2, Globe, Sparkles } from "lucide-react";
import { BrandLockup, BrandMark } from "../components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../components/FacelessCharacters";

export const Scene5OutroCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const ctaSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 11, stiffness: 120 },
  });

  const pulse = Math.sin(frame / 8) * 0.03 + 1;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-6" : isSquare ? "pt-10 pb-20 px-8" : "pt-12 pb-20 px-12"
      }`}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 48 : 40} />
        <div className="bg-emerald-500/20 border-2 border-emerald-400/50 px-4 py-2 rounded-full text-xs font-black text-emerald-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Monefyi Estimator</span>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.94, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1020px] my-auto flex flex-col items-center text-center gap-5 z-10"
      >
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-500/50 mb-3 border border-white/20">
            <BrandMark size={44} />
          </div>

          <h1
            className={`font-black tracking-tight text-white leading-tight ${
              isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl" : "text-5xl"
            }`}
          >
            Saring Leads Cepat,
          </h1>
          <h2
            className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 leading-tight ${
              isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl" : "text-5xl"
            }`}
            style={{ filter: "drop-shadow(0 0 35px rgba(16, 185, 129, 0.4))" }}
          >
            Kirim Penawaran Akurat!
          </h2>
        </div>

        {/* 3 Outcome Pills */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xl">
          <div className="bg-[#0E1E19]/90 border border-emerald-500/40 p-3 rounded-2xl flex flex-col items-center text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <div className="text-xs font-black text-white">Funneling Otomatis</div>
            <div className="text-[10px] text-slate-400">Fokus leads panas</div>
          </div>

          <div className="bg-[#0E1E19]/90 border border-teal-500/40 p-3 rounded-2xl flex flex-col items-center text-center">
            <CheckCircle2 className="w-5 h-5 text-teal-400 mb-1" />
            <div className="text-xs font-black text-white">Hitung Realtime</div>
            <div className="text-[10px] text-slate-400">Modal & margin aman</div>
          </div>

          <div className="bg-[#0E1E19]/90 border border-emerald-400/50 p-3 rounded-2xl flex flex-col items-center text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 mb-1" />
            <div className="text-xs font-black text-white">PDF & TTD Resmi</div>
            <div className="text-[10px] text-slate-400">Kirim 1-klik di WA</div>
          </div>
        </div>

        {/* Big Clickable Website Call To Action */}
        <div
          style={{
            transform: `scale(${interpolate(ctaSpring, [0, 1], [0.85, 1]) * pulse})`,
            opacity: interpolate(ctaSpring, [0, 1], [0, 1]),
          }}
          className="w-full max-w-md bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 p-1 rounded-3xl shadow-[0_20px_60px_-10px_rgba(16,185,129,0.7)] cursor-pointer"
        >
          <div className="bg-[#04281E] rounded-[22px] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <Globe className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  COBA SEKARANG — GRATIS
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
                  estimator.monefyi.com
                </div>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Happy Victorious Faceless Vendor */}
        <div className="flex items-center justify-center gap-6 mt-1">
          <FacelessCustomer pose="pleased" scale={isReels ? 0.9 : 0.8} />
          <FacelessVendor pose="confident" scale={isReels ? 0.95 : 0.85} />
        </div>
      </div>
    </div>
  );
};
