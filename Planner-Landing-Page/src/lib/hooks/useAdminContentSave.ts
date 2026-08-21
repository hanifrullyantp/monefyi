"use client";

import { useContentStore } from "@/lib/store/contentStore";
import type { LandingContent } from "@/lib/types/content";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAdminContentSave() {
  const updateSection = useContentStore((s) => s.updateSection);
  const updateContent = useContentStore((s) => s.updateContent);
  const save = useContentStore((s) => s.save);

  const persistSection = <K extends keyof LandingContent>(
    section: K,
    data: LandingContent[K],
    setStatus: (s: SaveStatus) => void,
  ) => {
    setStatus("saving");
    updateSection(section, data);
    save();
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 2500);
  };

  const persistAll = (data: LandingContent, setStatus: (s: SaveStatus) => void) => {
    setStatus("saving");
    updateContent(data);
    save();
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 2500);
  };

  return { persistSection, persistAll, save };
}
