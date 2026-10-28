"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  /** Tinggi area layar (scrollable content di dalam) */
  screenHeight?: number;
}

/** Frame HP realistis — konten interaktif hanya di dalam layar. */
export function PhoneMockup({ children, className, screenHeight = 560 }: PhoneMockupProps) {
  return (
    <div className={cn("relative mx-auto select-none", className)} style={{ width: "min(100%, 320px)" }}>
      <div
        className="absolute -inset-3 rounded-[3rem] bg-gradient-to-b from-slate-400/40 to-slate-900/50 blur-2xl opacity-60 -z-10"
        aria-hidden
      />
      <div className="relative rounded-[2.75rem] p-[10px] bg-gradient-to-b from-[#3d3d3f] via-[#1c1c1e] to-[#0a0a0b] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="absolute left-0 top-[28%] h-12 w-[3px] rounded-r bg-[#2a2a2c] shadow-inner" aria-hidden />
        <div className="absolute left-0 top-[42%] h-16 w-[3px] rounded-r bg-[#2a2a2c]" aria-hidden />
        <div className="absolute right-0 top-[34%] h-20 w-[3px] rounded-l bg-[#2a2a2c]" aria-hidden />

        <div className="relative rounded-[2.25rem] overflow-hidden bg-black ring-1 ring-white/10">
          <div className="absolute top-0 inset-x-0 z-20 flex justify-center pt-2 pointer-events-none">
            <div className="h-[26px] w-[120px] rounded-full bg-black shadow-[inset_0_-1px_2px_rgba(255,255,255,0.08)] flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1a1a1c] ring-1 ring-white/5" />
              <div className="w-10 h-1 rounded-full bg-[#0d0d0f]" />
            </div>
          </div>

          <div
            className="relative bg-[#f4f6f5] overflow-hidden touch-pan-y"
            style={{ height: screenHeight }}
          >
            {children}
          </div>

          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-white/30 z-20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
