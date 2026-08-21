"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SiteContent } from "@/lib/types/content";
import { defaultContent } from "@/data/defaultContent";

interface ContentStore {
  content: SiteContent;
  isDirty: boolean;
  lastSaved: string | null;
  history: SiteContent[];
  updateContent: (updates: Partial<SiteContent>) => void;
  updateSection: <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => void;
  updateField: (section: keyof SiteContent, field: string, value: any) => void;
  resetContent: () => void;
  markSaved: () => void;
  saveToHistory: () => void;
  restoreFromHistory: (index: number) => void;
}

export const useContentStore = create<ContentStore>()(
  persist(
    (set, get) => ({
      content: defaultContent,
      isDirty: false,
      lastSaved: null,
      history: [],

      updateContent: (updates) => {
        set((state) => ({
          content: { ...state.content, ...updates },
          isDirty: true,
        }));
      },

      updateSection: (key, value) => {
        set((state) => ({
          content: { ...state.content, [key]: value },
          isDirty: true,
        }));
      },

      updateField: (section, field, value) => {
        set((state) => ({
          content: {
            ...state.content,
            [section]: {
              ...(state.content[section] as object),
              [field]: value,
            },
          },
          isDirty: true,
        }));
      },

      resetContent: () => {
        set({ content: defaultContent, isDirty: false });
      },

      markSaved: () => {
        set({ isDirty: false, lastSaved: new Date().toISOString() });
      },

      saveToHistory: () => {
        const { content, history } = get();
        const newHistory = [content, ...history].slice(0, 10);
        set({ history: newHistory });
      },

      restoreFromHistory: (index) => {
        const { history } = get();
        if (history[index]) {
          set({ content: history[index], isDirty: true });
        }
      },
    }),
    {
      name: "monefyi_content_lp2",
    }
  )
);
