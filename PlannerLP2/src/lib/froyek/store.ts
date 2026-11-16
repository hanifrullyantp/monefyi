"use client";

import { create } from "zustand";
import { defaultFroyekContent } from "./defaultContent";
import type { FroyekContent } from "./schema";
import { froyekContentSchema } from "./schema";
import { sanitizeText, setByPath } from "./sanitize";

const DRAFT_KEY = "froyek_landing_draft_v1";

interface FroyekStore {
  content: FroyekContent;
  dirty: boolean;
  editing: boolean;
  history: FroyekContent[];
  hydrate: (published: FroyekContent) => void;
  setEditing: (on: boolean) => void;
  patch: (path: string, value: string) => void;
  replace: (content: FroyekContent) => void;
  toggleSection: (id: string) => void;
  moveSection: (id: string, direction: -1 | 1) => void;
  undo: () => void;
  markClean: () => void;
}

function readDraft(): FroyekContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = froyekContentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeDraft(content: FroyekContent) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(content));
}

export const useFroyekStore = create<FroyekStore>((set, get) => ({
  content: defaultFroyekContent,
  dirty: false,
  editing: false,
  history: [],
  hydrate: (published) => {
    const draft = readDraft();
    if (draft) {
      set({ content: draft, dirty: true });
      return;
    }
    set({ content: published, dirty: false });
  },
  setEditing: (editing) => set({ editing }),
  patch: (path, value) => {
    const current = get().content;
    const next = froyekContentSchema.parse(
      setByPath(current, path, sanitizeText(value)),
    );
    writeDraft(next);
    set({ history: [...get().history, current].slice(-20), content: next, dirty: true });
  },
  replace: (content) => {
    const parsed = froyekContentSchema.parse(content);
    writeDraft(parsed);
    set({ history: [...get().history, get().content].slice(-20), content: parsed, dirty: true });
  },
  toggleSection: (id) => {
    const current = get().content;
    const next = {
      ...current,
      sectionVisibility: {
        ...current.sectionVisibility,
        [id]: current.sectionVisibility[id] === false,
      },
    };
    writeDraft(next);
    set({ history: [...get().history, current].slice(-20), content: next, dirty: true });
  },
  moveSection: (id, direction) => {
    const current = get().content;
    const order = [...current.sectionOrder];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const [item] = order.splice(index, 1);
    order.splice(target, 0, item);
    const next = { ...current, sectionOrder: order };
    writeDraft(next);
    set({ history: [...get().history, current].slice(-20), content: next, dirty: true });
  },
  undo: () => {
    const history = [...get().history];
    const previous = history.pop();
    if (!previous) return;
    writeDraft(previous);
    set({ history, content: previous, dirty: true });
  },
  markClean: () => {
    localStorage.removeItem(DRAFT_KEY);
    set({ dirty: false, history: [] });
  },
}));
