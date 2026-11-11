import React from "react";
import { useCurrentFrame } from "remotion";
import { Flame, Clock, Snowflake } from "lucide-react";

export interface Funnel3DProps {
  scale?: number;
}

export const Funnel3D: React.FC<Funnel3DProps> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const rotateGlow = (frame * 2) % 360;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformStyle: "preserve-3d",
      }}
      className="relative w-80 h-96 flex flex-col items-center justify-between select-none"
    >
      {/* Top Ambient Particle Funnel Rim */}
      <div
        style={{
          transform: `rotateZ(${rotateGlow}deg)`,
        }}
        className="absolute top-0 w-72 h-72 rounded-full border border-emerald-400/30 blur-[2px] pointer-events-none"
      />

      {/* Tier 1: Wide Ring (Dingin / Cold) */}
      <div
        style={{
          transform: "translateZ(30px)",
        }}
        className="w-full bg-gradient-to-r from-sky-950/90 to-blue-900/90 border-2 border-sky-400 rounded-2xl p-3 shadow-[0_10px_30px_rgba(56,189,248,0.3)] flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
            <Snowflake className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-black text-sky-300 uppercase">LEADS DINGIN</div>
            <div className="text-xs font-bold text-white">Tanya-tanya harga</div>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-sky-900/80 text-sky-200 px-2 py-0.5 rounded">Filter 1</span>
      </div>

      {/* Funnel Connecting Cone Line */}
      <div className="w-0.5 h-6 bg-gradient-to-b from-sky-400 to-amber-400 opacity-60" />

      {/* Tier 2: Mid Ring (Hangat / Warm) */}
      <div
        style={{
          transform: "translateZ(15px)",
        }}
        className="w-[85%] bg-gradient-to-r from-amber-950/90 to-yellow-950/90 border-2 border-amber-400 rounded-2xl p-3 shadow-[0_10px_30px_rgba(245,158,11,0.3)] flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-black text-amber-300 uppercase">LEADS HANGAT</div>
            <div className="text-xs font-bold text-white">Dana siap, beli nanti</div>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded">Filter 2</span>
      </div>

      <div className="w-0.5 h-6 bg-gradient-to-b from-amber-400 to-emerald-400 opacity-60" />

      {/* Tier 3: Golden Output (Panas / Hot Leads) */}
      <div
        style={{
          transform: "translateZ(0px)",
        }}
        className="w-[70%] bg-gradient-to-r from-emerald-950/95 to-teal-900/95 border-2 border-emerald-400 rounded-2xl p-3.5 shadow-[0_15px_40px_rgba(16,185,129,0.5)] flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-slate-950 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-black text-emerald-300 uppercase">LEADS PANAS</div>
            <div className="text-xs font-black text-white">SIAP BELI SEKARANG!</div>
          </div>
        </div>
        <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded shadow">
          CLOSING ✓
        </span>
      </div>
    </div>
  );
};
