import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ArrowRight, CheckCircle2, Globe, TrendingUp } from "lucide-react";
import { BrandLockup, BrandMark } from "../components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../components/FacelessCharacters";

export const Scene6OutroCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const check1 = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 120 } });
  const check2 = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 120 } });
  const check3 = spring({ frame: frame - 65, fps, config: { damping: 12, stiffness: 120 } });

  const ctaSpring = spring({
    frame: frame - 85,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const pulse = Math.sin(frame / 10) * 0.04 + 1;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-16 pb-28 px-8" : isSquare ? "pt-10 pb-24 px-8" : "pt-12 pb-24 px-12"
      }`}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 48 : 40} />
        <div className="bg-emerald-500/20 border-2 border-emerald-400/50 px-4 py-2 rounded-full text-xs font-black text-emerald-300">
          Monefyi Estimator
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.94, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1020px] my-auto flex flex-col items-center text-center gap-6 z-10"
      >
        {/* 3 Outcome Pillars */}
        <div className="grid grid-cols-3 gap-3.5 w-full">
          <div
            style={{
              transform: `scale(${check1})`,
              opacity: interpolate(check1, [0, 1], [0, 1]),
            }}
            className="bg-[#0E1E19]/90 border-2 border-emerald-500/50 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-2 shadow-xl"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white">Survei Tenang</div>
            <div className="text-xs text-white/70">Tidak ada item terlewat</div>
          </div>

          <div
            style={{
              transform: `scale(${check2})`,
              opacity: interpolate(check2, [0, 1], [0, 1]),
            }}
            className="bg-[#0E1E19]/90 border-2 border-teal-500/50 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-2 shadow-xl"
          >
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-teal-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white">Harga Tepat</div>
            <div className="text-xs text-white/70">Hitungan instan & akurat</div>
          </div>

          <div
            style={{
              transform: `scale(${check3})`,
              opacity: interpolate(check3, [0, 1], [0, 1]),
            }}
            className="bg-[#0E1E19]/90 border-2 border-emerald-400/60 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-2 shadow-xl shadow-emerald-500/20"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-emerald-300" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white">Untung Terjaga</div>
            <div className="text-xs text-white/70">Margin aman saat ditawar</div>
          </div>
        </div>

        {/* Happy Characters Celebrating */}
        <div className="flex items-center justify-center gap-8 my-1">
          <div className="text-center flex flex-col items-center">
            <FacelessVendor pose="confident" scale={isReels ? 1.05 : 0.9} />
            <span className="text-xs font-black text-emerald-400 uppercase mt-2 bg-emerald-950/70 border border-emerald-500/40 px-3 py-0.5 rounded-full">
              Kontraktor Sukses
            </span>
          </div>
          <div className="text-center flex flex-col items-center">
            <FacelessCustomer pose="pleased" scale={isReels ? 1.05 : 0.9} />
            <span className="text-xs font-black text-blue-400 uppercase mt-2 bg-blue-950/70 border border-blue-500/40 px-3 py-0.5 rounded-full">
              Customer Puas
            </span>
          </div>
        </div>

        {/* Big CTA Box */}
        <div
          style={{
            transform: `scale(${ctaSpring * pulse})`,
            opacity: interpolate(ctaSpring, [0, 1], [0, 1]),
          }}
          className="w-full bg-gradient-to-b from-[#132A22] to-[#0A1713] border-2 border-emerald-400 p-7 sm:p-9 rounded-3xl shadow-2xl shadow-emerald-500/40 flex flex-col items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-400/10 to-emerald-500/10 opacity-50 pointer-events-none" />

          <BrandMark size={64} />

          <div className="space-y-1.5 z-10">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Coba Estimator Sekarang
            </h2>
            <p className="text-white/80 text-sm sm:text-base font-medium">
              Amankan margin & standarkan survei bengkel / kontraktor Anda.
            </p>
          </div>

          {/* Website URL Button */}
          <div className="z-10 inline-flex items-center gap-3 bg-gradient-to-r from-emerald-400 to-teal-400 text-black px-8 py-4 rounded-2xl font-black text-2xl sm:text-3xl tracking-tight shadow-xl shadow-emerald-400/40">
            <Globe className="w-6 h-6 text-black" />
            <span>estimator.monefyi.com</span>
            <ArrowRight className="w-6 h-6 text-black" />
          </div>
        </div>
      </div>
    </div>
  );
};
