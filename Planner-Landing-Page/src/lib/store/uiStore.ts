"use client";
import { create } from "zustand";
import type { LynkProduct } from "@/lib/checkout/products";

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
  isLoginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  isUpsellModalOpen: boolean;
  upsellMessage: string;
  setUpsellModalOpen: (open: boolean) => void;
  openUpsell: (message?: string) => void;
  pendingCheckoutProduct: LynkProduct | null;
  setPendingCheckoutProduct: (product: LynkProduct | null) => void;
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
  isLoginModalOpen: false,
  setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),
  isUpsellModalOpen: false,
  upsellMessage: "",
  setUpsellModalOpen: (open) => set({ isUpsellModalOpen: open }),
  openUpsell: (message) =>
    set({ isUpsellModalOpen: true, upsellMessage: message ?? "" }),
  pendingCheckoutProduct: null,
  setPendingCheckoutProduct: (product) => set({ pendingCheckoutProduct: product }),
}));
