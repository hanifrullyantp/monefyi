import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AlertCircle } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";
import { FacelessVendor } from "../../EstimatorMotionVideo/components/FacelessCharacters";
import { ChatBubble3D } from "../components/ChatBubble3D";
import { IsometricStage3D } from "../components/IsometricStage3D";

export const Scene1Hook3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;

  const isZonkPhase = frame >= 60;

  // Spring pops
  const b1 = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 120 } });
  const b2 = spring({ frame: frame - 25, fps, config: { damping: 12, stiffness: 120 } });
  const b3 = spring({ frame: frame - 45, fps, config: { damping: 12, stiffness: 120 } });
  const zonkSpring = spring({ frame: frame - 60, fps, config: { damping: 10, stiffness: 140 } });

  return (
    <IsometricStage3D mood={isZonkPhase ? "alert" : "tech"} tiltX={14} tiltY={-10}>
      <div
        className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
          isReels ? "pt-16 pb-28 px-6" : "pt-12 pb-20 px-10"
        }`}
      >
        {/* Top Brand Bar */}
        <div className="w-full flex justify-between items-center z-20">
          <BrandLockup size={isReels ? 46 : 40} />
          <div className="bg-red-500/20 border border-red-500/50 px-4 py-1.5 rounded-full text-xs font-bold text-red-300 flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>DILEMA KONTRAKTOR & BENGKEL</span>
          </div>
        </div>

        {/* Dynamic Titles */}
        <div className="w-full my-auto flex flex-col items-center text-center z-20 max-w-[960px]">
          {!isZonkPhase ? (
            <div className="space-y-2">
              <h1
                className={`font-black tracking-tight text-white ${
                  isReels ? "text-5xl sm:text-6xl" : "text-5xl"
                }`}
              >
                BANJIR CHAT
              </h1>
              <h2
                className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-200 ${
                  isReels ? "text-6xl sm:text-7xl" : "text-6xl"
                }`}
                style={{ filter: "drop-shadow(0 0 30px rgba(16, 185, 129, 0.4))" }}
              >
                TANYA HARGA?
              </h2>
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${interpolate(zonkSpring, [0, 1], [0.88, 1])})`,
              }}
              className="space-y-2"
            >
              <h1
                className={`font-black tracking-tight text-red-500 ${
                  isReels ? "text-6xl sm:text-7xl" : "text-6xl"
                }`}
                style={{ filter: "drop-shadow(0 0 35px rgba(239, 68, 68, 0.5))" }}
              >
                PAS DISURVEI... ZONK?
              </h1>
              <p className="text-amber-300 font-extrabold text-lg sm:text-xl">
                Waktu & bensin terbuang untuk penanya yang belum tentu beli!
              </p>
            </div>
          )}

          {/* 3D Isometric Scene Center */}
          <div
            className={`w-full mt-6 flex ${
              isReels ? "flex-col items-center gap-6" : "flex-row items-center justify-center gap-12"
            } relative`}
          >
            {/* 3D Overwhelmed Character */}
            <div className="relative z-10 filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
              <FacelessVendor pose="panicking" scale={isReels ? 1.05 : 0.95} />
            </div>

            {/* Floating 3D Chat Bubbles in Depth */}
            <div className="flex flex-col gap-3 relative z-20">
              <div
                style={{
                  transform: `scale(${b1}) translateY(${interpolate(b1, [0, 1], [30, 0])}px)`,
                  opacity: interpolate(b1, [0, 1], [0, 1]),
                }}
              >
                <ChatBubble3D
                  sender="Pak Budi WA"
                  message="Mas, estimasi kitchen set 3m berapa ya?"
                  time="10:02"
                  rotX={8}
                  rotY={-12}
                  translateZ={30}
                />
              </div>

              <div
                style={{
                  transform: `scale(${b2}) translateY(${interpolate(b2, [0, 1], [30, 0])}px)`,
                  opacity: interpolate(b2, [0, 1], [0, 1]),
                }}
              >
                <ChatBubble3D
                  sender="Ibu Dina"
                  message="Bisa diskon 50% ga mas? Mau bandingkan dulu..."
                  time="10:05"
                  rotX={12}
                  rotY={-8}
                  translateZ={50}
                  isZonk={isZonkPhase}
                />
              </div>

              <div
                style={{
                  transform: `scale(${b3}) translateY(${interpolate(b3, [0, 1], [30, 0])}px)`,
                  opacity: interpolate(b3, [0, 1], [0, 1]),
                }}
              >
                <ChatBubble3D
                  sender="Customer Baru"
                  message="Survei ke lokasi dulu ya, belum tentu jadi sih..."
                  time="10:08"
                  rotX={6}
                  rotY={-15}
                  translateZ={20}
                  isZonk={isZonkPhase}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </IsometricStage3D>
  );
};
