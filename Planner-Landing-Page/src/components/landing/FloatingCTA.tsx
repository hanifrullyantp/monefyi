"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLandingCta } from "@/lib/hooks/useLandingCta";

export function FloatingCTA() {
  const { label, handleCtaClick } = useLandingCta();
  const [visible, setVisible] = useState(false);
  const pricingRef = useRef<Element | null>(null);

  useEffect(() => {
    pricingRef.current = document.getElementById("harga");

    const handleScroll = () => {
      const heroHeight = document.getElementById("hero")?.offsetHeight ?? 800;
      const scrollY = window.scrollY;
      const afterHero = scrollY > heroHeight;

      if (pricingRef.current) {
        const rect = pricingRef.current.getBoundingClientRect();
        const pricingVisible = rect.top < window.innerHeight && rect.bottom > 0;
        setVisible(afterHero && !pricingVisible);
      } else {
        setVisible(afterHero);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none",
      )}
    >
      <button
        type="button"
        onClick={handleCtaClick}
        className="bg-slate-900 text-white shadow-2xl rounded-full px-6 py-3 font-semibold text-sm inline-flex items-center gap-2 hover:bg-slate-800 transition-colors whitespace-nowrap"
      >
        {label}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
