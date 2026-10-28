"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  screenHeight?: number;
}

/** Frame HP — lebar dari token `--phone-mockup-w` (240 / 280px). */
export function PhoneMockup({ children, className, screenHeight = 480 }: PhoneMockupProps) {
  return (
    <div
      className={cn("relative mx-auto select-none shrink-0", className)}
      style={{ width: "var(--phone-mockup-w)" }}
    >
      <div
        className="absolute -inset-2 rounded-[2.75rem] bg-gradient-to-b from-slate-400/30 to-slate-900/40 blur-xl opacity-50 -z-10"
        aria-hidden
      />
      <div className="relative rounded-[2.5rem] p-[9px] bg-gradient-to-b from-[#3d3d3f] via-[#1c1c1e] to-[#0a0a0b] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)]">
        <div className="absolute left-0 top-[28%] h-10 w-[3px] rounded-r bg-[#2a2a2c]" aria-hidden />
        <div className="absolute right-0 top-[34%] h-16 w-[3px] rounded-l bg-[#2a2a2c]" aria-hidden />

        <div className="relative rounded-[2rem] overflow-hidden bg-black ring-1 ring-white/10">
          <div className="absolute top-0 inset-x-0 z-20 flex justify-center pt-1.5 pointer-events-none">
            <div className="h-[22px] w-[100px] rounded-full bg-black flex items-center justify-center">
              <div className="w-9 h-1 rounded-full bg-[#0d0d0f]" />
            </div>
          </div>

          <div
            className="relative bg-[#f4f6f5] overflow-hidden touch-pan-y"
            style={{ height: screenHeight }}
          >
            {children}
          </div>

          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/25 z-20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
