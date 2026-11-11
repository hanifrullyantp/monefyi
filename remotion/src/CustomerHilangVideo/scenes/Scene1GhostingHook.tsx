import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AlertCircle, CheckCheck, Ghost, MessageSquare, Sparkles } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";
import { FacelessCustomer, FacelessVendor } from "../../EstimatorMotionVideo/components/FacelessCharacters";

export const Scene1GhostingHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const titleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const badgeSpring = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 120 } });
  const chatSpring = spring({ frame: frame - 25, fps, config: { damping: 12, stiffness: 110 } });

  // Customer vanishing animation (Ghosting effect)
  const customerFade = interpolate(frame, [30, 95], [1, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const customerScale = interpolate(frame, [30, 95], [1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "py-16 px-8" : isSquare ? "py-10 px-8" : "py-14 px-12"
      }`}
    >
      {/* Top Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 46 : 40} />
        <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Psikologi Closing Kontraktor</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full my-auto flex flex-col items-center text-center z-10 max-w-[980px]">
        {/* Warning Badge */}
        <div
          style={{
            transform: `scale(${badgeSpring})`,
            opacity: interpolate(badgeSpring, [0, 1], [0, 1]),
          }}
          className="inline-flex items-center gap-2 bg-amber-500/20 border-2 border-amber-500/50 px-6 py-2 rounded-full mb-5 shadow-xl shadow-amber-500/20"
        >
          <Ghost className="w-5 h-5 text-amber-400" />
          <span className="text-amber-300 font-black tracking-wider text-xs sm:text-sm uppercase">
            Fenomena Ghosting Setelah Survei
          </span>
        </div>

        {/* Big Impact Title */}
        <div
          style={{
            transform: `scale(${interpolate(titleSpring, [0, 1], [0.92, 1])}) translateY(${interpolate(
              titleSpring,
              [0, 1],
              [25, 0]
            )}px)`,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
          className="space-y-2 mb-6"
        >
          <div
            className={`font-black tracking-tight text-white/90 ${
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl sm:text-4xl" : "text-4xl"
            }`}
          >
            SETELAH DISURVEI...
          </div>
          <div
            className={`font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-red-500 leading-none ${
              isReels ? "text-6xl sm:text-7xl" : isSquare ? "text-5xl sm:text-6xl" : "text-6xl"
            }`}
            style={{
              filter: "drop-shadow(0 0 35px rgba(245, 158, 11, 0.45))",
            }}
          >
            CUSTOMER TIBA-TIBA HILANG?
          </div>
          <div
            className={`font-bold text-white/75 ${
              isReels ? "text-xl max-w-[750px]" : "text-base sm:text-lg max-w-[650px]"
            } mx-auto mt-2`}
          >
            Padahal waktu survei di lokasi, dia kelihatan semangat banget!
          </div>
        </div>

        {/* Character interaction & Chat Mockup */}
        <div
          className={`w-full flex items-center justify-center ${
            isReels ? "flex-col gap-6" : "flex-row gap-10"
          }`}
        >
          {/* Vendor looking baffled */}
          <div className="flex flex-col items-center">
            <FacelessVendor pose="scratch_head" scale={isReels ? 1.15 : 0.95} />
            <span className="text-xs font-black text-amber-400 uppercase mt-2 bg-amber-950/70 border border-amber-500/40 px-3 py-1 rounded-full">
              Vendor Bingung
            </span>
          </div>

          {/* Unanswered WhatsApp Chat Card */}
          <div
            style={{
              transform: `scale(${chatSpring})`,
              opacity: interpolate(chatSpring, [0, 1], [0, 1]),
            }}
            className="bg-[#0B1512] border-2 border-white/15 rounded-3xl p-5 shadow-2xl max-w-[420px] w-full text-left space-y-3"
          >
            <div className="flex justify-between items-center pb-2.5 border-b border-white/10 text-xs font-bold text-white/60">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <MessageSquare className="w-4 h-4" /> WhatsApp Chat
              </span>
              <span>Kemarin 16:30</span>
            </div>

            {/* Vendor message */}
            <div className="bg-[#0F392B] p-3 rounded-2xl rounded-tr-none text-white text-xs sm:text-sm ml-6 space-y-1">
              <div>"Halo Bu Novia, ini rekap survei kitchen set kemarin ya..."</div>
              <div className="flex justify-end items-center gap-1 text-[10px] text-emerald-300">
                <span>16:31</span>
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              </div>
            </div>

            {/* Follow up message */}
            <div className="bg-[#0F392B] p-3 rounded-2xl rounded-tr-none text-white text-xs sm:text-sm ml-6 space-y-1">
              <div>"Kira-kira bagaimana bu kelanjutannya? Jadi deal?"</div>
              <div className="flex justify-end items-center gap-1 text-[10px] text-white/60">
                <span>Hari ini 09:15</span>
                <CheckCheck className="w-3.5 h-3.5 text-white/50" />
              </div>
            </div>

            {/* Ghosting Status */}
            <div className="bg-red-500/20 border border-red-500/40 p-2.5 rounded-xl flex items-center gap-2 text-xs text-red-300 font-bold">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Hanya dibaca • Tanpa balasan</span>
            </div>
          </div>

          {/* Customer Silhouette Ghosting */}
          <div
            style={{
              opacity: customerFade,
              transform: `scale(${customerScale})`,
            }}
            className="flex flex-col items-center relative"
          >
            <FacelessCustomer pose="skeptical" scale={isReels ? 1.15 : 0.95} />
            <span className="text-xs font-black text-white/50 uppercase mt-2 bg-neutral-900/80 border border-white/10 px-3 py-1 rounded-full">
              {frame > 60 ? "Ghosting..." : "Customer Antusias"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="text-xs font-semibold text-emerald-400/60 tracking-widest uppercase z-10">
        Estimator by Monefyi • Kenapa Customer Bisa Dingin?
      </div>
    </div>
  );
};

