"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { getSectionComponent, resolveSectionOrder, type LandingSectionKey } from "@/lib/landingSections";

const EAGER_SECTIONS = new Set<LandingSectionKey>(["hero", "trustBadges"]);

function DeferredSection({ Component }: { Component: ComponentType }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const target = sectionRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} style={shouldRender ? undefined : { minHeight: "55vh" }} aria-hidden={!shouldRender}>
      {shouldRender ? <Component /> : null}
    </div>
  );
}

export function LandingPageSections() {
  const { content } = useContentStore();
  const order = resolveSectionOrder(content.sectionOrder);
  const visibility = content.sectionVisibility;

  return (
    <>
      {order.map((key) => {
        if (visibility[key] === false) return null;
        const Section = getSectionComponent(key);
        if (!Section) return null;
        return EAGER_SECTIONS.has(key) ? <Section key={key} /> : <DeferredSection key={key} Component={Section} />;
      })}
    </>
  );
}
