"use client";
import { create } from "zustand";
import { defaultContent } from "@/data/defaultContent";
import type { LandingContent } from "@/lib/types/content";
import { getStorage, setStorage, saveVersion } from "@/lib/utils/storage";

const STORAGE_KEY = "monefyi_content";

interface ContentState {
  content: LandingContent;
  isDirty: boolean;
  lastSaved: Date | null;
  updateSection: <K extends keyof LandingContent>(section: K, data: LandingContent[K]) => void;
  updateContent: (data: LandingContent) => void;
  resetSection: <K extends keyof LandingContent>(section: K) => void;
  resetAll: () => void;
  save: () => void;
  load: () => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  content: defaultContent,
  isDirty: false,
  lastSaved: null,

  updateSection: (section, data) => {
    set((state) => ({
      content: { ...state.content, [section]: data },
      isDirty: true,
    }));
  },

  updateContent: (data) => {
    set({ content: data, isDirty: true });
  },

  resetSection: (section) => {
    set((state) => ({
      content: { ...state.content, [section]: defaultContent[section] },
      isDirty: true,
    }));
  },

  resetAll: () => {
    set({ content: defaultContent, isDirty: true });
  },

  save: () => {
    const { content } = get();
    saveVersion(STORAGE_KEY, content);
    setStorage(STORAGE_KEY, content);
    set({ isDirty: false, lastSaved: new Date() });
  },

  load: () => {
    const stored = getStorage<LandingContent>(STORAGE_KEY, defaultContent);
    // Merge dengan defaultContent untuk menangani field baru
    const merged = { ...defaultContent, ...stored };
    set({ content: merged, isDirty: false });
  },
}));
