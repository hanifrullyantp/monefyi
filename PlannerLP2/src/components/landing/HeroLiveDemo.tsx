"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { trackEvent } from "@/lib/analytics/events";

const DEMO_SRC = () => plannerAppPath("/demo-embed");

type DemoMessage = {
  type?: string;
  event?: string;
  is_demo?: boolean;
};

export function HeroLiveDemo() {
  const [loaded, setLoaded] = useState(false);
  const engagedRef = useRef(false);

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
    <div className="w-full flex justify-center">
      <PhoneMockup>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f4f6f5] text-sm font-semibold text-slate-500">
            Memuat demo…
          </div>
        )}
        <iframe
          title="Demo Estimator Monefyi"
          src={DEMO_SRC()}
          width={390}
          height={844}
          className={`block border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ width: 390, height: 844 }}
          onLoad={() => setLoaded(true)}
          allow="clipboard-write"
        />
      </PhoneMockup>
    </div>
  );
}
