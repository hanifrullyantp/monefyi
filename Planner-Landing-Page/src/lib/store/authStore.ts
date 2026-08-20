"use client";

import { create } from "zustand";
import { getStorage, setStorage, removeStorage } from "@/lib/utils/storage";
import {
  findAccount,
  toPublicUser,
  type AppUser,
  type ProductId,
} from "@/lib/accounts";

export type { ProductId, AppUser as User };

const AUTH_STORAGE_KEY = "monefyi_user_auth";

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => { success: boolean; error?: string; user?: AppUser };
  logout: () => void;
  consumePlannerTrialSlot: () => boolean;
}

function persistUser(user: AppUser | null) {
  if (user) setStorage(AUTH_STORAGE_KEY, user);
  else removeStorage(AUTH_STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,

  hydrate: () => {
    const stored = getStorage<AppUser | null>(AUTH_STORAGE_KEY, null);
    set({
      user: stored,
      isAuthenticated: Boolean(stored),
      hydrated: true,
    });
  },

  login: (email, password) => {
    const match = findAccount(email, password);
    if (!match) {
      return { success: false, error: "Email atau password salah." };
    }
    const user = toPublicUser(match);
    persistUser(user);
    set({ user, isAuthenticated: true });
    return { success: true, user };
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
    const next: AppUser = { ...user, plannerTrialUses: user.plannerTrialUses - 1 };
    persistUser(next);
    set({ user: next });
    return true;
  },
}));

export function hasOwnedProduct(user: AppUser | null, product: ProductId): boolean {
  return Boolean(user?.ownedProducts.includes(product));
}
