"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MediaFile {
  id: string;
  url: string;
  name: string;
  type: string;
  size: string;
}

interface MediaStore {
  files: MediaFile[];
  addFile: (file: MediaFile) => void;
  removeFile: (id: string) => void;
}

export const useMediaStore = create<MediaStore>()(
  persist(
    (set) => ({
      files: [
        { id: "1", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop", name: "hero-dashboard.jpg", type: "image/jpeg", size: "245 KB" },
        { id: "2", url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2574&auto=format&fit=crop", name: "team-work.jpg", type: "image/jpeg", size: "120 KB" },
        { id: "3", url: "https://images.unsplash.com/photo-1551288049-bbbda5366a71?q=80&w=2670&auto=format&fit=crop", name: "analytics-preview.jpg", type: "image/jpeg", size: "180 KB" },
      ],
      addFile: (file) => set((state) => ({ files: [file, ...state.files] })),
      removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
    }),
    { name: "monefyi-media" }
  )
);
