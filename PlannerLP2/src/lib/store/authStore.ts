"use client";

import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { getStorage, setStorage, removeStorage } from "@/lib/utils/storage";
import {
  type AppUser,
  type ProductId,
  findAccount,
  toPublicUser,
} from "@/lib/accounts";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  signInWithPassword as sbSignIn,
  signOutGlobal,
} from "@/lib/services/authService";
import { loadUserSubscriptionContext } from "@/lib/services/subscriptionService";

export type { ProductId, AppUser as User };

const AUTH_STORAGE_KEY = "monefyi_user_auth";
const TRIAL_USES_KEY = "monefyi_planner_trial_uses";

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  orgId: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AppUser }>;
  loginMock: (email: string, password: string) => { success: boolean; error?: string; user?: AppUser };
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  consumePlannerTrialSlot: () => boolean;
}

function persistUser(user: AppUser | null) {
  if (user) setStorage(AUTH_STORAGE_KEY, user);
  else removeStorage(AUTH_STORAGE_KEY);
}

function readTrialUsesOverride(userId: string): number | null {
  const map = getStorage<Record<string, number>>(TRIAL_USES_KEY, {});
  const n = map[userId];
  return typeof n === "number" ? n : null;
}

function writeTrialUsesOverride(userId: string, uses: number) {
  const map = getStorage<Record<string, number>>(TRIAL_USES_KEY, {});
  map[userId] = uses;
  setStorage(TRIAL_USES_KEY, map);
}

async function buildUserFromSession(session: Session): Promise<AppUser> {
  const ctx = await loadUserSubscriptionContext(session.user.id);
  const trialOverride = readTrialUsesOverride(session.user.id);
  const name =
    (session.user.user_metadata?.name as string | undefined) ||
    session.user.email?.split("@")[0] ||
    "User";

  return {
    id: session.user.id,
    name,
    email: session.user.email || "",
    orgId: ctx.orgId,
    subscriptionTier: ctx.subscriptionTier,
    estimatorVariant: ctx.estimatorVariant,
    ownedProducts: ctx.ownedProducts,
    plannerTrialUses: trialOverride ?? ctx.plannerTrialUses,
    isAdmin: false,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,
  orgId: null,

  hydrate: async () => {
    if (!isSupabaseConfigured()) {
      const stored = getStorage<AppUser | null>(AUTH_STORAGE_KEY, null);
      set({
        user: stored,
        isAuthenticated: Boolean(stored),
        orgId: stored?.orgId ?? null,
        hydrated: true,
      });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      set({ hydrated: true });
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const user = await buildUserFromSession(data.session);
      persistUser(user);
      set({ user, isAuthenticated: true, orgId: user.orgId, hydrated: true });
      return;
    }

    persistUser(null);
    set({ user: null, isAuthenticated: false, orgId: null, hydrated: true });
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return get().loginMock(email, password);
    }

    const { data, error } = await sbSignIn(email, password);
    if (error || !data.session) {
      return { success: false, error: error?.message ?? "Login gagal." };
    }

    const user = await buildUserFromSession(data.session);
    persistUser(user);
    set({ user, isAuthenticated: true, orgId: user.orgId });
    return { success: true, user };
  },

  loginMock: (email, password) => {
    const match = findAccount(email, password);
    if (!match) {
      return { success: false, error: "Email atau password salah." };
    }
    const user = toPublicUser(match);
    persistUser(user);
    set({ user, isAuthenticated: true, orgId: user.orgId ?? null });
    return { success: true, user };
  },

  refreshUser: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const user = await buildUserFromSession(data.session);
    persistUser(user);
    set({ user, isAuthenticated: true, orgId: user.orgId });
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await signOutGlobal();
    }
    persistUser(null);
    set({ user: null, isAuthenticated: false, orgId: null });
  },

  consumePlannerTrialSlot: () => {
    const { user } = get();
    if (!user) return false;
    if (user.ownedProducts.includes("planner")) return true;
    if (user.plannerTrialUses <= 0) return false;
    const nextUses = user.plannerTrialUses - 1;
    writeTrialUsesOverride(user.id, nextUses);
    const next: AppUser = { ...user, plannerTrialUses: nextUses };
    persistUser(next);
    set({ user: next });
    return true;
  },
}));

export function hasOwnedProduct(user: AppUser | null, product: ProductId): boolean {
  return Boolean(user?.ownedProducts.includes(product));
}
