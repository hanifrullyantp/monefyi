"use client";
import { create } from "zustand";

interface UiState {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  scrollY: number;
  setScrollY: (y: number) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  inlineEditMode: boolean;
  setInlineEditMode: (mode: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  activeSection: "hero",
  setActiveSection: (section) => set({ activeSection: section }),
  scrollY: 0,
  setScrollY: (y) => set({ scrollY: y }),
  isAdmin: false,
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  inlineEditMode: false,
  setInlineEditMode: (mode) => set({ inlineEditMode: mode }),
}));
