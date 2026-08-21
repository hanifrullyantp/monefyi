export type ProductId = "estimator" | "planner" | "stay" | "finance";

export type SubscriptionTier = "free" | "estimator" | "pro" | "enterprise";
export type EstimatorVariant = "standard" | "pro" | null;

export interface AppUser {
  id: string;
  name: string;
  email: string;
  orgId?: string | null;
  subscriptionTier?: SubscriptionTier;
  estimatorVariant?: EstimatorVariant;
  ownedProducts: ProductId[];
  plannerTrialUses: number;
  /** Akses CMS landing (/admin) & inline edit. */
  isAdmin?: boolean;
}

export type AppAccount = AppUser & { password: string };

/** Akun mock — disimpan & diverifikasi via localStorage / API auth. */
export const APP_ACCOUNTS: AppAccount[] = [
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
  {
    id: "usr_hanif_admin",
    name: "Hanif Rullyant",
    email: "hanif.rullyant@gmail.com",
    password: "@Rullyant93",
    ownedProducts: ["estimator", "planner", "stay", "finance"],
    plannerTrialUses: 999,
    isAdmin: true,
  },
];

export function findAccount(email: string, password: string): AppAccount | null {
  const normalized = email.trim().toLowerCase();
  return (
    APP_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === normalized && a.password === password,
    ) ?? null
  );
}

export function toPublicUser(account: AppAccount): AppUser {
  const { password: _password, ...user } = account;
  return user;
}

export function canAccessAdminPanel(account: AppAccount): boolean {
  return Boolean(account.isAdmin);
}
