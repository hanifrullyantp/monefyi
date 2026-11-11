import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Check, MessageCircle, ShieldCheck, Wifi, Battery } from "lucide-react";
import { BrandMark } from "../../EstimatorMotionVideo/components/BrandMark";

export interface PhoneMockup3DProps {
  scale?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  sceneFrame?: number;
  triggerRecalc?: boolean;
  showShield?: boolean;
}

export const PhoneMockup3D: React.FC<PhoneMockup3DProps> = ({
  scale = 1,
  rotX = 12,
  rotY = -15,
  rotZ = 2,
  sceneFrame = 0,
  triggerRecalc = false,
  showShield = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Floating gentle levitation
  const levitate = Math.sin(frame / 16) * 8;

  // Recalculation spring
  const recalcAnim = spring({
    frame: triggerRecalc ? Math.max(0, sceneFrame - 20) : 0,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const sizeVal = interpolate(recalcAnim, [0, 1], [3.8, 4.5]).toFixed(1);
  const itemPrice = Math.round(parseFloat(sizeVal) * 2900000);
  const totalPrice = itemPrice + 21982000;
  const profit = Math.round(totalPrice * 0.36);

  // Shield sheet spring
  const shieldAnim = spring({
    frame: showShield ? Math.max(0, sceneFrame - 15) : 0,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  return (
    <div
      style={{
        transform: `scale(${scale}) translateY(${levitate}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
        transformStyle: "preserve-3d",
      }}
      className="relative w-[340px] h-[680px] select-none transition-transform duration-300"
    >
      {/* 3D Deep Ground Shadow */}
      <div
        style={{
          transform: "translateZ(-80px) rotateX(90deg) translateY(120px)",
          filter: "blur(32px)",
        }}
        className="absolute inset-x-6 bottom-0 h-32 bg-emerald-950/80 rounded-full pointer-events-none"
      />

      {/* 3D Smartphone Extruded Chassis (Backplate) */}
      <div
        style={{
          transform: "translateZ(-14px)",
        }}
        className="absolute inset-0 bg-[#0E1A16] rounded-[52px] border-4 border-[#1B332B] shadow-[0_40px_80px_rgba(0,0,0,0.9)]"
      />

      {/* 3D Chassis Side Thickness (Sides simulated with box shadows) */}
      <div
        style={{
          transform: "translateZ(0px)",
        }}
        className="absolute inset-0 bg-[#0B1512] rounded-[48px] p-3 border-2 border-emerald-500/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
      >
        {/* Screen Bezel Metallic Trim */}
        <div className="relative w-full h-full bg-[#08110D] rounded-[38px] flex flex-col overflow-hidden border border-emerald-500/30">
          {/* iOS Dynamic Island & Status Bar */}
          <div className="w-full pt-2.5 px-6 flex justify-between items-center text-[10px] font-black text-emerald-300/80 bg-[#0A1612]">
            <span>09:41</span>
            <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <Battery className="w-3 h-3" />
            </div>
          </div>

          {/* App Header */}
          <div className="px-4 py-2.5 bg-[#0D1D17] border-b border-emerald-500/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BrandMark size={24} />
              <span className="text-sm font-black text-white tracking-tight">Estimator</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-400/40">
              EST-2026
            </span>
          </div>

          {/* Screen Content */}
          <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
            {/* Grand Emerald Banner with Live Recalculation */}
            <div className="bg-gradient-to-br from-[#105E46] to-[#0A3D2D] rounded-2xl p-3.5 text-white shadow-lg space-y-2 border border-emerald-400/30">
              <div className="flex justify-between items-center">
                <span className="bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-200">
                  Kitchen 4m Pontianak
                </span>
                <span className="text-[9px] text-emerald-300 font-bold">Realtime</span>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">TOTAL HARGA</div>
                <div className="text-xl font-black font-mono tracking-tight text-white">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/20 flex justify-between items-center text-[10px]">
                <span className="text-emerald-200 font-bold">Est. Profit:</span>
                <span className="font-mono font-black text-emerald-300">
                  Rp {Math.round(profit / 1000000)}jt (36%)
                </span>
              </div>
            </div>

            {/* Itemized Row (Interactive Size & Price) */}
            <div className="bg-[#0C1A14] border-2 border-emerald-400/70 rounded-xl p-2.5 shadow-md space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                  <span className="text-[11px] font-black text-white">Kabinet Atas HPL</span>
                </div>
                <span className="text-[11px] font-black font-mono text-emerald-300">
                  Rp {itemPrice.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Dynamic Size Indicator */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div className="bg-black/40 border border-emerald-500/40 rounded-lg p-1.5 text-center">
                  <div className="text-[8px] uppercase text-emerald-400/80 font-bold">Ukuran</div>
                  <div className="text-xs font-mono font-black text-white">{sizeVal} meter</div>
                </div>
                <div className="bg-black/40 border border-emerald-500/40 rounded-lg p-1.5 text-center">
                  <div className="text-[8px] uppercase text-emerald-400/80 font-bold">Harga/m</div>
                  <div className="text-xs font-mono font-black text-white">Rp 2.900.000</div>
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="bg-[#0C1A14] border border-emerald-500/20 rounded-xl p-2.5 flex justify-between items-center text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500/40 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="font-bold text-slate-300">Kabinet Bawah Sink</span>
              </div>
              <span className="font-mono font-bold text-slate-200">Rp 11.020.000</span>
            </div>

            {/* Quick Action Bar */}
            <div className="bg-[#10B981] text-slate-950 rounded-xl py-2 px-3 text-center text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/40">
              <MessageCircle className="w-3.5 h-3.5" /> Kirim WhatsApp (1-Klik)
            </div>
          </div>

          {/* 3D Bottom Sheet Overlay: Batas Aman Diskon */}
          {showShield && (
            <div
              style={{
                transform: `translateY(${interpolate(shieldAnim, [0, 1], [180, 0])}px)`,
                opacity: interpolate(shieldAnim, [0, 1], [0, 1]),
              }}
              className="absolute left-2 right-2 bottom-2 bg-gradient-to-t from-[#091510] to-[#122A20] border-2 border-emerald-400 p-3 rounded-2xl shadow-2xl z-40 text-white"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-200">Batas Aman Nego</span>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Anti Boncos
                </span>
              </div>
              <div className="text-[10px] text-white/80">Diskon Maks: Rp 2.000.000 (Margin 31% Tetap Aman!)</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
