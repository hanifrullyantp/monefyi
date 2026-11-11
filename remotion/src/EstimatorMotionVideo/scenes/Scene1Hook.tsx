import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MessageSquare, XCircle, Sparkles } from "lucide-react";
import { BrandLockup } from "../components/BrandMark";
import { FacelessVendor } from "../components/FacelessCharacters";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  // Timings:
  // 0 - 150: Chat WA masuk terus!
  // 150 - 210: Apakah harus dilayani sepenuh tenaga?
  // 210 - 309: Jawabannya TIDAK! Karena tidak semua siap membeli!
  const isQuestionPhase = frame >= 60 && frame < 155;
  const isNoPhase = frame >= 155;

  // Spring animations for notifications
  const chat1 = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 120 } });
  const chat2 = spring({ frame: frame - 25, fps, config: { damping: 12, stiffness: 120 } });
  const chat3 = spring({ frame: frame - 45, fps, config: { damping: 12, stiffness: 120 } });
  const noPop = spring({ frame: frame - 155, fps, config: { damping: 10, stiffness: 160 } });

  const vendorPose = isNoPhase ? "scratch_head" : "panicking";

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${isReels ? "pt-16 pb-28 px-6" : isSquare ? "pt-10 pb-20 px-8" : "pt-12 pb-20 px-12"
        }`}
    >
      {/* Top Header */}
      <div className="w-full flex justify-between items-center z-20">
        <BrandLockup size={isReels ? 46 : 40} />
        <div className="bg-emerald-950/70 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>STRATEGI FUNNELING ESTIMASI</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full my-auto flex flex-col items-center text-center z-10 max-w-[980px]">
        {/* Dynamic Badge */}
        {!isNoPhase ? (
          <div className="inline-flex items-center gap-2.5 bg-emerald-500/20 border-2 border-emerald-400/60 px-6 py-2 rounded-full mb-4 shadow-xl shadow-emerald-500/20">
            <MessageSquare className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-black tracking-wider text-xs sm:text-sm uppercase">
              NOTIFIKASI WHATSAPP MEMBLUDAK
            </span>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${noPop})` }}
            className="inline-flex items-center gap-2.5 bg-red-500/25 border-2 border-red-500/70 px-6 py-2.5 rounded-full mb-4 shadow-2xl shadow-red-500/40"
          >
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300 font-black tracking-wider text-xs sm:text-sm uppercase">
              STOP BUANG-BUANG ENERGI!
            </span>
          </div>
        )}

        {/* Dynamic Big Headings */}
        {!isNoPhase ? (
          <div className="space-y-2">
            <h1
              className={`font-black tracking-tight text-white ${isReels ? "text-5xl sm:text-6xl" : isSquare ? "text-4xl" : "text-5xl"
                }`}
            >
              CHAT WHATSAPP
            </h1>
            <h2
              className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-teal-200 ${isReels ? "text-6xl sm:text-7xl" : isSquare ? "text-5xl" : "text-6xl"
                }`}
              style={{ filter: "drop-shadow(0 0 30px rgba(16, 185, 129, 0.4))" }}
            >
              MASUK TERUS?
            </h2>
            {isQuestionPhase && (
              <p className="text-amber-300 font-bold text-lg sm:text-2xl mt-2 max-w-xl mx-auto">
                Apakah semuanya harus kamu layani sepenuh tenaga?
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2" style={{ transform: `scale(${interpolate(noPop, [0, 1], [0.9, 1])})` }}>
            <h1
              className={`font-black tracking-tight text-red-500 ${isReels ? "text-7xl sm:text-8xl" : isSquare ? "text-6xl" : "text-7xl"
                }`}
              style={{ filter: "drop-shadow(0 0 35px rgba(239, 68, 68, 0.5))" }}
            >
              JAWABANNYA: TIDAK!
            </h1>
            <p
              className={`font-black text-white/90 max-w-xl mx-auto ${isReels ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                }`}
            >
              Karena <span className="text-emerald-400 underline decoration-wavy">tidak semua</span> yang bertanya{" "}
              <span className="text-amber-400">siap membeli!</span>
            </p>
          </div>
        )}

        {/* Central Graphic Area */}
        <div
          className={`w-full mt-6 flex ${isReels ? "flex-col items-center" : "flex-row items-center justify-center gap-10"
            } relative`}
        >
          {/* Overwhelmed Faceless Contractor */}
          <div className="relative z-10">
            <FacelessVendor pose={vendorPose} scale={isReels ? 1.05 : 0.95} />
          </div>

          {/* Incoming WhatsApp Floating Message Cards */}
          <div
            className={`flex flex-col gap-3 z-20 ${isReels
                ? "w-full max-w-md mt-4"
                : "w-80"
              }`}
          >
            {/* WA Notification 1 */}
            <div
              style={{
                transform: `scale(${chat1}) translateY(${interpolate(chat1, [0, 1], [30, 0])}px)`,
                opacity: interpolate(chat1, [0, 1], [0, 1]),
              }}
              className="bg-[#0B2E24]/90 border border-emerald-500/40 backdrop-blur-md rounded-2xl p-3 shadow-xl flex items-start gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-md">
                <MessageSquare className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-emerald-200">Customer WA</span>
                  <span className="text-[10px] text-slate-400">10:02</span>
                </div>
                <p className="text-sm font-bold text-white mt-0.5">
                  "Mas, estimasi kitchen set 3m berapa ya?"
                </p>
              </div>
            </div>

            {/* WA Notification 2 */}
            <div
              style={{
                transform: `scale(${chat2}) translateY(${interpolate(chat2, [0, 1], [30, 0])}px)`,
                opacity: interpolate(chat2, [0, 1], [0, 1]),
              }}
              className="bg-[#0B2E24]/90 border border-emerald-500/40 backdrop-blur-md rounded-2xl p-3 shadow-xl flex items-start gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-md">
                <MessageSquare className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-emerald-200">Pak Hendra (Survei)</span>
                  <span className="text-[10px] text-slate-400">10:05</span>
                </div>
                <p className="text-sm font-bold text-white mt-0.5">
                  "Bisa minta pricelist & diskon 40% ga mas?"
                </p>
              </div>
            </div>

            {/* WA Notification 3 */}
            <div
              style={{
                transform: `scale(${chat3}) translateY(${interpolate(chat3, [0, 1], [30, 0])}px)`,
                opacity: interpolate(chat3, [0, 1], [0, 1]),
              }}
              className="bg-[#0B2E24]/90 border border-emerald-500/40 backdrop-blur-md rounded-2xl p-3 shadow-xl flex items-start gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-md">
                <MessageSquare className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-emerald-200">Ibu Maya</span>
                  <span className="text-[10px] text-slate-400">10:07</span>
                </div>
                <p className="text-sm font-bold text-white mt-0.5">
                  "Baru tanya-tanya dulu ya, mau bandingkan tetangga..."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
