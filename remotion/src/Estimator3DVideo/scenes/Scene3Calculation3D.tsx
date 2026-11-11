import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Sliders, TrendingUp } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";
import { IsometricStage3D } from "../components/IsometricStage3D";
import { ModularCabinet3D } from "../components/ModularCabinet3D";
import { PhoneMockup3D } from "../components/PhoneMockup3D";

export const Scene3Calculation3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;

  const enterSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });

  return (
    <IsometricStage3D mood="tech" tiltX={14} tiltY={-14}>
      <div
        className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
          isReels ? "pt-16 pb-28 px-6" : "pt-12 pb-20 px-10"
        }`}
      >
        {/* Top Header */}
        <div className="w-full flex justify-between items-center z-20">
          <BrandLockup size={isReels ? 46 : 40} />
          <div className="bg-emerald-500/20 border border-emerald-400/50 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>KALKULASI REALTIME 3D</span>
          </div>
        </div>

        {/* Dynamic Titles */}
        <div className="w-full my-auto flex flex-col items-center text-center z-20 max-w-[960px]">
          <div
            style={{
              transform: `scale(${interpolate(enterSpring, [0, 1], [0.92, 1])})`,
              opacity: interpolate(enterSpring, [0, 1], [0, 1]),
            }}
            className="space-y-1 mb-4"
          >
            <h1
              className={`font-black tracking-tight text-white ${
                isReels ? "text-4xl sm:text-5xl" : "text-4xl"
              }`}
            >
              KETIK UKURAN DARI CHAT
            </h1>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 ${
                isReels ? "text-5xl sm:text-6xl" : "text-5xl"
              }`}
            >
              MODAL & PROFIT TERHITUNG!
            </h2>
            <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-400/60 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-emerald-200 mt-1 shadow">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Margin 36% Terjaga Otomatis</span>
            </div>
          </div>

          {/* 3D Phone + 3D Modular Cabinet Side by Side */}
          <div
            className={`w-full flex ${
              isReels ? "flex-col items-center gap-6" : "flex-row items-center justify-center gap-12"
            }`}
          >
            {/* 3D Modular Cabinet Stretching */}
            <div className="filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
              <ModularCabinet3D sceneFrame={frame} scale={isReels ? 0.95 : 1} />
            </div>

            {/* 3D Floating Smartphone */}
            <div className="filter drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
              <PhoneMockup3D
                scale={isReels ? 0.88 : 0.92}
                sceneFrame={frame}
                triggerRecalc={true}
                showShield={false}
              />
            </div>
          </div>
        </div>
      </div>
    </IsometricStage3D>
  );
};

