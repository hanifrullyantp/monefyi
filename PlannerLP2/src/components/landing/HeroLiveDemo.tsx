"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { trackEvent } from "@/lib/analytics/events";

const DEMO_SRC = () => plannerAppPath("/demo-embed");

type DemoMessage = {
  type?: string;
  event?: string;
  is_demo?: boolean;
};

export function HeroLiveDemo({ pulseToken = 0 }: { pulseToken?: number }) {
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const engagedRef = useRef(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = demoRef.current;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
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
    <div ref={demoRef} className="w-full flex justify-center">
      <PhoneMockup pulseToken={pulseToken}>
        {!loaded && (
          <div className="absolute inset-0 z-[1] bg-[#f4f6f5]">
            <Image
              src="/brand/estimator/demo-preview.png"
              alt="Pratinjau aplikasi Monefyi Estimator"
              fill
              priority
              sizes="390px"
              className="object-cover"
            />
            {shouldLoad && (
              <span className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow">
                Memuat demo interaktif…
              </span>
            )}
          </div>
        )}
        {shouldLoad && (
          <iframe
            title="Demo Estimator Monefyi"
            src={DEMO_SRC()}
            width={390}
            height={844}
            loading="eager"
            fetchPriority="high"
            className={`block border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            style={{ width: 390, height: 844 }}
            onLoad={() => setLoaded(true)}
            allow="clipboard-write"
          />
        )}
      </PhoneMockup>
    </div>
  );
}
