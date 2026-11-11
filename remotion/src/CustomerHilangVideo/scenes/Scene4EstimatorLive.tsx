import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CheckCircle2, FileText, Flame, MessageCircle, Send, Sparkles } from "lucide-react";
import { BrandLockup } from "../../EstimatorMotionVideo/components/BrandMark";
import { ExactEstimatorApp } from "../../EstimatorMotionVideo/components/ExactEstimatorApp";
import { FacelessVendor } from "../../EstimatorMotionVideo/components/FacelessCharacters";

export const Scene4EstimatorLive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isReels = height > width;
  const isSquare = height === width;

  const enterSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });

  // Scene relative frames for App phases:
  // 0 - 150: Editor View (isi ukuran & pilih item)
  // 150 - 300: Live Calculation update
  // 300 - 422: WhatsApp Modal & PDF
  const activePhase: 1 | 2 | 3 | 4 = frame < 150 ? 2 : frame < 280 ? 2 : 4;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between items-center text-white select-none ${
        isReels ? "pt-14 pb-28 px-6" : isSquare ? "pt-8 pb-22 px-6" : "pt-10 pb-22 px-10"
      }`}
    >
      {/* Top Header */}
      <div className="w-full flex justify-between items-center z-10">
        <BrandLockup size={isReels ? 46 : 40} />
        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 px-4 py-1.5 rounded-full text-xs font-black text-emerald-300">
          <Flame className="w-4 h-4 text-emerald-400" />
          <span>SOLUSI NYATA DI LAPANGAN</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.94, 1])})`,
          opacity: interpolate(enterSpring, [0, 1], [0, 1]),
        }}
        className="w-full max-w-[1080px] my-auto flex flex-col items-center gap-5 z-10"
      >
        {/* Dynamic Title */}
        <div className="flex flex-col items-center text-center gap-2">
          <h2
            className={`font-black tracking-tight leading-tight ${
              isReels ? "text-4xl sm:text-5xl" : isSquare ? "text-3xl sm:text-4xl" : "text-4xl"
            }`}
          >
            Sebut Harga Selagi <span className="text-emerald-400 text-glow-emerald">Emosinya Masih Panas!</span>
          </h2>
          <p className="text-white/80 font-medium text-sm sm:text-base max-w-[700px]">
            Isi ukuran, pilih item, total penawaran langsung muncul di depan customer. Kirim PDF resmi via WhatsApp!
          </p>

          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/50 px-5 py-1.5 rounded-2xl text-xs sm:text-sm font-black text-emerald-300 shadow-lg">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Kalkulasi Instan & Kirim Penawaran Sebelum Pamit Pulang</span>
          </div>
        </div>

        {/* Real App UI & Character Layout */}
        <div
          className={`w-full flex items-center justify-center ${
            isReels ? "flex-col gap-4" : "flex-row gap-8"
          }`}
        >
          {/* Real App Mockup (Phone) */}
          <div className="flex justify-center items-center">
            <ExactEstimatorApp
              phase={activePhase}
              sceneFrame={frame}
              scale={isReels ? 1.08 : isSquare ? 0.95 : 1.02}
            />
          </div>

          {/* Side Info Cards & Vendor Character */}
          <div
            className={`flex ${
              isReels ? "flex-row gap-4 items-center justify-center" : "flex-col gap-4 w-[340px]"
            }`}
          >
            <div className="bg-[#0E1E19] border-2 border-emerald-500/50 p-4 rounded-2xl text-left shadow-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-300 uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Muncul Langsung di Depan Klien
              </div>
              <div className="text-xs text-white/80 leading-relaxed">
                Tidak ada hitung manual bermalam-malam. Angka modal & profit Anda aman terjaga.
              </div>
            </div>

            <div className="bg-[#0E1E19] border-2 border-teal-500/50 p-4 rounded-2xl text-left shadow-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-teal-300 uppercase">
                <MessageCircle className="w-4 h-4 text-teal-400" />
                Langsung Kirim WhatsApp + PDF
              </div>
              <div className="text-xs text-white/80 leading-relaxed">
                Klien langsung pegang dokumen penawaran resmi saat emosinya masih 100% ingin beli.
              </div>
            </div>

            {/* Vendor Pose */}
            <div className="flex flex-col items-center">
              <FacelessVendor pose="confident" scale={isReels ? 0.95 : 1.05} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

