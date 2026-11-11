import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ArrowRight, CheckCircle2, Globe, Sparkles } from "lucide-react";
import { BrandLockup, BrandMark } from "../../EstimatorMotionVideo/components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../../EstimatorMotionVideo/components/FacelessCharacters";
import { IsometricStage3D } from "../components/IsometricStage3D";

export const Scene5Outro3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;

  const enterSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const ctaSpring = spring({ frame: frame - 20, fps, config: { damping: 11, stiffness: 120 } });
  const pulse = Math.sin(frame / 8) * 0.03 + 1;

  return (
    <IsometricStage3D mood="success" tiltX={12} tiltY={-8}>
      <div
        className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
          isReels ? "pt-16 pb-28 px-6" : "pt-12 pb-20 px-10"
        }`}
      >
        {/* Top Header */}
        <div className="w-full flex justify-between items-center z-20">
          <BrandLockup size={isReels ? 48 : 42} />
          <div className="bg-emerald-500/20 border-2 border-emerald-400/50 px-4 py-2 rounded-full text-xs font-black text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monefyi Estimator 3D</span>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            transform: `scale(${interpolate(enterSpring, [0, 1], [0.92, 1])})`,
            opacity: interpolate(enterSpring, [0, 1], [0, 1]),
          }}
          className="w-full max-w-[960px] my-auto flex flex-col items-center text-center gap-5 z-20"
        >
          {/* Brand Icon */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-500/50 border border-white/20">
            <BrandMark size={44} />
          </div>

          {/* Big Impact Titles */}
          <div className="space-y-1">
            <h1
              className={`font-black tracking-tight text-white leading-tight ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
            >
              CLOSING LEBIH CEPAT,
            </h1>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 leading-tight ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
              style={{ filter: "drop-shadow(0 0 35px rgba(16, 185, 129, 0.45))" }}
            >
              UNTUNG AMAN TANPA BONCOS!
            </h2>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
            <div className="bg-[#0E1E19]/90 border border-emerald-500/40 p-2.5 rounded-2xl flex flex-col items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-0.5" />
              <div className="text-xs font-black text-white">Saring Cepat</div>
            </div>
            <div className="bg-[#0E1E19]/90 border border-teal-500/40 p-2.5 rounded-2xl flex flex-col items-center">
              <CheckCircle2 className="w-4 h-4 text-teal-400 mb-0.5" />
              <div className="text-xs font-black text-white">Hitung Realtime</div>
            </div>
            <div className="bg-[#0E1E19]/90 border border-emerald-400/50 p-2.5 rounded-2xl flex flex-col items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 mb-0.5" />
              <div className="text-xs font-black text-white">PDF + TTD Resmi</div>
            </div>
          </div>

          {/* Glowing 3D URL Capsule Button */}
          <div
            style={{
              transform: `scale(${interpolate(ctaSpring, [0, 1], [0.85, 1]) * pulse})`,
              opacity: interpolate(ctaSpring, [0, 1], [0, 1]),
            }}
            className="w-full max-w-md bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 p-1 rounded-3xl shadow-[0_20px_60px_-10px_rgba(16,185,129,0.7)] cursor-pointer"
          >
            <div className="bg-[#04281E] rounded-[22px] px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                    COBA GRATIS SEKARANG
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
                    estimator.monefyi.com
                  </div>
                </div>
              </div>

              <div className="w-9 h-9 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </div>
            </div>
          </div>

          {/* Victorious Characters */}
          <div className="flex items-center justify-center gap-6 mt-1">
            <FacelessCustomer pose="pleased" scale={isReels ? 0.9 : 0.85} />
            <FacelessVendor pose="confident" scale={isReels ? 0.95 : 0.9} />
          </div>
        </div>
      </div>
    </IsometricStage3D>
  );
};

