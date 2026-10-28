"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const NATIVE_W = 390;
const NATIVE_H = 844;

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  pulseToken?: number;
}

function viewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function cssPx(root: CSSStyleDeclaration, name: string, fallback: number): number {
  const n = parseFloat(root.getPropertyValue(name));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Frame HP: isi di-render pada viewport native iPhone (390×844)
 * lalu di-scale. Tinggi frame mengikuti tinggi layar user (minus header),
 * lebar mengikuti rasio 390:844 dan dibatasi lebar viewport.
 */
export function PhoneMockup({ children, className, pulseToken = 0 }: PhoneMockupProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState<number | null>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      const root = getComputedStyle(document.documentElement);
      const bezel = cssPx(root, "--phone-bezel", 10);
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      const header = cssPx(
        root,
        isLg ? "--header-h-desktop" : "--header-h-mobile",
        isLg ? 64 : 56,
      );
      const maxFrameH = Math.max(200, viewportHeight() - header - 12);
      const heightBasedW = ((maxFrameH - bezel * 2) * NATIVE_W) / NATIVE_H + bezel * 2;
      const maxW = window.innerWidth - 16;
      const width = Math.min(heightBasedW, maxW);
      setFrameW(width);
      setScale(Math.max(0.01, (width - bezel * 2) / NATIVE_W));
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  useLayoutEffect(() => {
    if (!pulseToken) return;
    const frame = frameRef.current;
    const glow = glowRef.current;
    const restart = (el: HTMLElement | null, cls: string) => {
      if (!el) return;
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    };
    restart(frame, "hero-demo-blink-frame");
    restart(glow, "hero-demo-blink-glow");
  }, [pulseToken]);

  return (
    <div
      id="hero-demo"
      className={cn(
        "relative mx-auto select-none shrink-0",
        "scroll-mt-[calc(var(--header-h-mobile)+8px)] lg:scroll-mt-[calc(var(--header-h-desktop)+8px)]",
        className,
      )}
      style={{ width: frameW ?? "var(--phone-mockup-w)" }}
    >
      <div
        ref={glowRef}
        className="absolute -inset-2 rounded-[2.75rem] bg-gradient-to-b from-slate-400/30 to-slate-900/40 blur-xl opacity-50 -z-10"
        aria-hidden
      />
      <div
        ref={frameRef}
        className="relative bg-gradient-to-b from-[#3d3d3f] via-[#1c1c1e] to-[#0a0a0b] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)]"
        style={{ borderRadius: "2.5rem", padding: "var(--phone-bezel)" }}
      >
        <div className="absolute left-0 top-[28%] h-10 w-[3px] rounded-r bg-[#2a2a2c]" aria-hidden />
        <div className="absolute right-0 top-[34%] h-16 w-[3px] rounded-l bg-[#2a2a2c]" aria-hidden />

        <div
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
