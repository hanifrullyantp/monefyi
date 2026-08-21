import type { ProductId, User } from "@/lib/store/authStore";

/** Maksimal proyek aktif saat trial Planner (user Estimator). */
export const PLANNER_TRIAL_MAX_PROJECTS = 2;

export type EstimatorFeature =
  | "create_estimation"
  | "export_pdf"
  | "wa_screening_templates"
  | "client_lead_database";

export type PlannerTrialFeature = "convert_to_project" | "basic_kanban";

export type PlannerLockedFeature =
  | "team_members"
  | "project_expense"
  | "client_portal"
  | "invoice_termin";

/** Fitur Estimator penuh untuk pembeli paket 99rb+. */
export const ESTIMATOR_ACCESS: Record<EstimatorFeature, boolean> = {
  create_estimation: true,
  export_pdf: true,
  wa_screening_templates: true,
  client_lead_database: true,
};

/**
 * Trial Planner — tersedia otomatis jika user punya Estimator.
 * Convert & kanban dibatasi jumlah proyek; fitur lain dilock → upsell.
 */
export const PLANNER_TRIAL_ACCESS: Record<PlannerTrialFeature, "allowed" | "limited"> = {
  convert_to_project: "limited",
  basic_kanban: "limited",
};

export const PLANNER_LOCKED_FEATURES: PlannerLockedFeature[] = [
  "team_members",
  "project_expense",
  "client_portal",
  "invoice_termin",
];

export const PLANNER_LOCKED_LABELS: Record<PlannerLockedFeature, string> = {
  team_members: "Tambah Anggota Tim",
  project_expense: "Catat Pengeluaran Proyek",
  client_portal: "Client Portal",
  invoice_termin: "Invoice & Termin",
};

export function ownsPlanner(user: User | null): boolean {
  return Boolean(user?.ownedProducts.includes("planner"));
}

export function ownsEstimator(user: User | null): boolean {
  return Boolean(user?.ownedProducts.includes("estimator"));
}

export function isEstimatorPro(user: User | null): boolean {
  return user?.estimatorVariant === "pro";
}

export function canUseEstimatorFeature(user: User | null, _feature: EstimatorFeature): boolean {
  return ownsEstimator(user);
}

/** Slot trial tersisa (0 jika sudah full planner). */
export function plannerTrialSlotsRemaining(user: User | null): number {
  if (!user) return 0;
  if (ownsPlanner(user)) return Infinity;
  if (!ownsEstimator(user)) return 0;
  return user.plannerTrialUses;
}

export function canConvertEstimationToProject(
  user: User | null,
  activeTrialProjects = 0,
): boolean {
  if (!user || !ownsEstimator(user)) return false;
  if (ownsPlanner(user)) return true;
  if (activeTrialProjects >= PLANNER_TRIAL_MAX_PROJECTS) return false;
  return user.plannerTrialUses > 0;
}

export function canUsePlannerTrialFeature(
  user: User | null,
  feature: PlannerTrialFeature,
  activeTrialProjects = 0,
): boolean {
  if (!user || !ownsEstimator(user)) return false;
  if (ownsPlanner(user)) return true;
  if (PLANNER_TRIAL_ACCESS[feature] === "limited") {
    return activeTrialProjects < PLANNER_TRIAL_MAX_PROJECTS;
  }
  return true;
}

export function isPlannerFeatureLocked(user: User | null, feature: PlannerLockedFeature): boolean {
  if (!user) return true;
  if (ownsPlanner(user)) return false;
  return PLANNER_LOCKED_FEATURES.includes(feature);
}

export function getUpsellReason(
  user: User | null,
  context: "locked_feature" | "trial_limit",
  feature?: PlannerLockedFeature,
): string {
  if (context === "trial_limit") {
    return `Trial Planner hanya untuk ${PLANNER_TRIAL_MAX_PROJECTS} proyek aktif. Upgrade untuk proyek tanpa batas.`;
  }
  const label = feature ? PLANNER_LOCKED_LABELS[feature] : "fitur ini";
  return `${label} tersedia penuh di Monefyi Planner Lifetime.`;
}

export function productLabel(id: ProductId): string {
  const map: Record<ProductId, string> = {
    estimator: "Monefyi Estimator",
    planner: "Monefyi Planner",
    stay: "Monefyi Stay",
    finance: "Monefyi Finance",
  };
  return map[id];
}
