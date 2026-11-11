import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Filter, Zap } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../../EstimatorMotionVideo/components/FacelessCharacters";
import { Funnel3D } from "../components/Funnel3D";
import { IsometricStage3D } from "../components/IsometricStage3D";

export const Scene2Funnel3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;

  const enterSpring = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
  const funnelSpring = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 100 } });

  return (
    <IsometricStage3D mood="funnel" tiltX={16} tiltY={-12}>
      <div
        className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
          isReels ? "pt-16 pb-28 px-6" : "pt-12 pb-20 px-10"
        }`}
      >
        {/* Top Header */}
        <div className="w-full flex justify-between items-center z-20">
          <BrandLockup size={isReels ? 46 : 40} />
          <div className="bg-emerald-500/20 border border-emerald-400/50 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>SISTEM FUNNELING OTOMATIS</span>
          </div>
        </div>

        {/* Dynamic Titles */}
        <div className="w-full my-auto flex flex-col items-center text-center z-20 max-w-[960px]">
          <div
            style={{
              transform: `scale(${interpolate(enterSpring, [0, 1], [0.9, 1])})`,
              opacity: interpolate(enterSpring, [0, 1], [0, 1]),
            }}
            className="space-y-2 mb-4"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 px-4 py-1 rounded-full text-xs font-black uppercase">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              HITUNGAN DETIK
            </div>
            <h1
              className={`font-black tracking-tight text-white ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
            >
              STOP BUANG WAKTU!
            </h1>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
            >
              SARING PEMBELI SERIUS
            </h2>
          </div>

          {/* 3D Funnel and Characters Area */}
          <div
            style={{
              transform: `scale(${interpolate(funnelSpring, [0, 1], [0.85, 1])})`,
              opacity: interpolate(funnelSpring, [0, 1], [0, 1]),
            }}
            className={`w-full flex ${
              isReels ? "flex-col items-center gap-6" : "flex-row items-center justify-center gap-12"
            }`}
          >
            {/* Characters on left */}
            <div className="flex items-center gap-3">
              <FacelessCustomer pose="pleased" scale={isReels ? 0.9 : 0.85} />
              <FacelessVendor pose="confident" scale={isReels ? 0.95 : 0.9} />
            </div>

            {/* 3D Funnel Centerpiece */}
            <div className="filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              <Funnel3D scale={isReels ? 1 : 0.95} />
            </div>
          </div>
        </div>
      </div>
    </IsometricStage3D>
  );
};

