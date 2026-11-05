"use client";

import { useContentStore } from "@/lib/store/contentStore";
import { getSectionComponent, resolveSectionOrder } from "@/lib/landingSections";

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
        return <Section key={key} />;
      })}
    </>
  );
}
