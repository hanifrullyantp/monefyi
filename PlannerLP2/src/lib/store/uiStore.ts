"use client";
import { create } from "zustand";
import type { LynkProduct } from "@/lib/checkout/products";

interface UIStore {
  isMobileMenuOpen: boolean;
  isAdminSidebarOpen: boolean;
  activeSection: string;
  isAdmin: boolean;
  isEditMode: boolean;
  isLoginModalOpen: boolean;
  pendingCheckoutProduct: LynkProduct | null;
  setMobileMenuOpen: (open: boolean) => void;
  setAdminSidebarOpen: (open: boolean) => void;
  setActiveSection: (section: string) => void;
  setAdmin: (isAdmin: boolean) => void;
  setEditMode: (isEditMode: boolean) => void;
  setLoginModalOpen: (open: boolean) => void;
  setPendingCheckoutProduct: (product: LynkProduct | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isMobileMenuOpen: false,
  isAdminSidebarOpen: true,
  activeSection: "hero",
  isAdmin: false,
  isEditMode: false,
  isLoginModalOpen: false,
  pendingCheckoutProduct: null,

  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setAdminSidebarOpen: (open) => set({ isAdminSidebarOpen: open }),
  setActiveSection: (section) => set({ activeSection: section }),
  setAdmin: (isAdmin) => set({ isAdmin }),
  setEditMode: (isEditMode) => set({ isEditMode }),
  setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),
  setPendingCheckoutProduct: (product) => set({ pendingCheckoutProduct: product }),
}));
