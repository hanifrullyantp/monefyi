"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const NATIVE_W = 390;
const NATIVE_H = 844;

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
}

/**
 * Frame HP: isi di-render pada viewport native iPhone (390×844)
 * lalu di-scale ke lebar token --phone-mockup-w.
 * Skala hanya pada frame — komposisi UI sama dengan aplikasi mobile.
 */
export function PhoneMockup({ children, className }: PhoneMockupProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / NATIVE_W);
    };
    update();
    const raf = requestAnimationFrame(update);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className={cn("relative mx-auto select-none shrink-0", className)}
      style={{ width: "var(--phone-mockup-w)" }}
    >
      <div
        className="absolute -inset-2 rounded-[2.75rem] bg-gradient-to-b from-slate-400/30 to-slate-900/40 blur-xl opacity-50 -z-10"
        aria-hidden
      />
      <div
        className="relative bg-gradient-to-b from-[#3d3d3f] via-[#1c1c1e] to-[#0a0a0b] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)]"
        style={{ borderRadius: "2.5rem", padding: "var(--phone-bezel)" }}
      >
        <div className="absolute left-0 top-[28%] h-10 w-[3px] rounded-r bg-[#2a2a2c]" aria-hidden />
        <div className="absolute right-0 top-[34%] h-16 w-[3px] rounded-l bg-[#2a2a2c]" aria-hidden />

        <div
          ref={screenRef}
          className="relative overflow-hidden bg-black ring-1 ring-white/10"
          style={{
            borderRadius: "2rem",
            width: "100%",
            aspectRatio: `${NATIVE_W} / ${NATIVE_H}`,
            containerType: "size",
          }}
        >
          <div className="absolute top-0 inset-x-0 z-20 flex justify-center pt-2 pointer-events-none">
            <div className="h-[22px] w-[96px] rounded-full bg-black flex items-center justify-center">
              <div className="w-9 h-1 rounded-full bg-[#0d0d0f]" />
            </div>
          </div>

          <div
            className="absolute top-0 left-0 origin-top-left bg-[#f4f6f5]"
            style={{
              width: NATIVE_W,
              height: NATIVE_H,
              transform: scale > 0 ? `scale(${scale})` : `scale(calc(100cqw / ${NATIVE_W}px))`,
            }}
          >
            {children}
          </div>

          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-white/25 z-20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
