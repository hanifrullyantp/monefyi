"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { trackEvent } from "@/lib/analytics/events";

const DEMO_SRC = () => plannerAppPath("/demo-embed");
const IFRAME_HEIGHT = 560;

type DemoMessage = {
  type?: string;
  event?: string;
  is_demo?: boolean;
};

export function HeroLiveDemo() {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const engagedRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin: "120px", threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as DemoMessage;
      if (!data || data.type !== "monefyi-demo" || !data.is_demo || !data.event) return;
      trackEvent("view_hero", { variant_id: "hero_live_demo", demo_event: data.event });
      if (data.event === "demo_first_interaction" && !engagedRef.current) {
        engagedRef.current = true;
        trackEvent("calc_start", { source: "hero_demo", is_demo: true });
      }
      if (data.event === "demo_wa_click") {
        trackEvent("calc_complete", { source: "hero_demo", is_demo: true });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div ref={rootRef} className="w-full flex justify-center">
      <PhoneMockup screenHeight={IFRAME_HEIGHT}>
        {!inView && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f4f6f5] text-xs font-semibold text-[var(--muted)]">
            Memuat demo…
          </div>
        )}
        {inView && (
          <iframe
            title="Demo Estimator Monefyi"
            src={DEMO_SRC()}
            className={`w-full h-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            allow="clipboard-write"
          />
        )}
      </PhoneMockup>
    </div>
  );
}
