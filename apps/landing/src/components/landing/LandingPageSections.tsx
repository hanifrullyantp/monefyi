"use client";

import { useContentStore } from "@/lib/store/contentStore";
import { getSectionComponent, resolveSectionOrder } from "@/lib/landingSections";

export function LandingPageSections() {
  const { content } = useContentStore();
  const order = resolveSectionOrder(content.sectionOrder);
  const visibility = content.sectionVisibility;

  return (
    <>
      {order.map((key, idx) => {
        if (visibility[key] === false) return null;
        const Section = getSectionComponent(key);
        if (!Section) return null;
        if (idx <= 1 || key === "hero" || key === "trustBadges") {
          return <Section key={key} />;
        }
        return (
          <div
            key={key}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "auto 620px",
            }}
          >
            <Section />
          </div>
        );
      })}
    </>
  );
}
