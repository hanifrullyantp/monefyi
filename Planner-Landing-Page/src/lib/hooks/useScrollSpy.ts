"use client";
import { useEffect, useState } from "react";

export function useScrollSpy(sectionIds: string[], offset: number = 80): string {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || "");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + offset + 10;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop <= scrollY) {
          setActiveSection(id);
          return;
        }
      }
      setActiveSection(sectionIds[0] || "");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionIds, offset]);

  return activeSection;
}
