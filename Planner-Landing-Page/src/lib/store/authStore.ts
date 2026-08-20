"use client";

import { create } from "zustand";
import { getStorage, setStorage, removeStorage } from "@/lib/utils/storage";

export type ProductId = "estimator" | "planner" | "stay" | "finance";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Produk yang dimiliki user (Estimator = gerbang freemium). */
  ownedProducts: ProductId[];
  /** Sisa slot convert ke proyek Planner (trial, max 2). */
  plannerTrialUses: number;
}

const AUTH_STORAGE_KEY = "monefyi_user_auth";

/** Akun demo — password: password123 */
export const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: "usr_estimator_01",
    name: "Budi Kontraktor",
    email: "user@monefyi.com",
    password: "password123",
    ownedProducts: ["estimator"],
    plannerTrialUses: 2,
  },
  {
    id: "usr_full_01",
    name: "Sari Planner",
    email: "planner@monefyi.com",
    password: "password123",
    ownedProducts: ["estimator", "planner"],
    plannerTrialUses: 999,
  },
];

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  /** Kurangi slot trial saat user convert estimasi → proyek. */
  consumePlannerTrialSlot: () => boolean;
}

function persistUser(user: User | null) {
  if (user) setStorage(AUTH_STORAGE_KEY, user);
  else removeStorage(AUTH_STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,

  hydrate: () => {
    const stored = getStorage<User | null>(AUTH_STORAGE_KEY, null);
    set({
      user: stored,
      isAuthenticated: Boolean(stored),
      hydrated: true,
    });
  },

  login: (email, password) => {
    const match = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!match) {
      return { success: false, error: "Email atau password salah." };
    }
    const { password: _pw, ...user } = match;
    persistUser(user);
    set({ user, isAuthenticated: true });
    return { success: true };
  },

  logout: () => {
    persistUser(null);
    set({ user: null, isAuthenticated: false });
  },

  consumePlannerTrialSlot: () => {
    const { user } = get();
    if (!user) return false;
    if (user.ownedProducts.includes("planner")) return true;
    if (user.plannerTrialUses <= 0) return false;
    const next: User = { ...user, plannerTrialUses: user.plannerTrialUses - 1 };
    persistUser(next);
    set({ user: next });
    return true;
  },
}));

export function hasOwnedProduct(user: User | null, product: ProductId): boolean {
  return Boolean(user?.ownedProducts.includes(product));
}
