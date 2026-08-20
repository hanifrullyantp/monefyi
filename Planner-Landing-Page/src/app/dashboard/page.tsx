"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, LogOut, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useUiStore } from "@/lib/store/uiStore";
import {
  PLANNER_LOCKED_LABELS,
  PLANNER_TRIAL_MAX_PROJECTS,
  canConvertEstimationToProject,
  getUpsellReason,
  isPlannerFeatureLocked,
  ownsEstimator,
  plannerTrialSlotsRemaining,
  type PlannerLockedFeature,
} from "@/lib/permissions";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { useLandingCta } from "@/lib/hooks/useLandingCta";

const TRIAL_PROJECTS_KEY = "monefyi_trial_active_projects";

const LOCKED_FEATURES: PlannerLockedFeature[] = [
  "team_members",
  "project_expense",
  "client_portal",
  "invoice_termin",
];

export default function DashboardPage() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const consumePlannerTrialSlot = useAuthStore((s) => s.consumePlannerTrialSlot);
  const openUpsell = useUiStore((s) => s.openUpsell);
  const { openLogin } = useLandingCta();
  const [activeProjects, setActiveProjects] = useState(0);

  useEffect(() => {
    hydrate();
    const n = Number(localStorage.getItem(TRIAL_PROJECTS_KEY) ?? "0");
    setActiveProjects(Number.isFinite(n) ? n : 0);
  }, [hydrate]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Estimator</h1>
          <p className="mt-3 text-slate-600">Login dulu untuk akses estimasi & trial Planner.</p>
          <button
            type="button"
            onClick={openLogin}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
          >
            Login
          </button>
          <Link href="/" className="mt-4 block text-sm text-emerald-600">
            ← Kembali ke landing
          </Link>
        </div>
      </div>
    );
  }

  const trialSlots = plannerTrialSlotsRemaining(user);
  const canConvert = canConvertEstimationToProject(user, activeProjects);

  const handleConvert = () => {
    if (!canConvert) {
      openUpsell(getUpsellReason(user, "trial_limit"));
      return;
    }
    if (!consumePlannerTrialSlot()) {
      openUpsell(getUpsellReason(user, "trial_limit"));
      return;
    }
    const next = activeProjects + 1;
    setActiveProjects(next);
    localStorage.setItem(TRIAL_PROJECTS_KEY, String(next));
  };

  const handleLockedClick = (feature: PlannerLockedFeature) => {
    if (isPlannerFeatureLocked(user, feature)) {
      openUpsell(getUpsellReason(user, "locked_feature", feature));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Dashboard</p>
            <h1 className="text-lg font-bold text-slate-900">{user.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
              Landing
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        {/* Estimator — full access */}
        {ownsEstimator(user) && (
          <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Monefyi Estimator</h2>
            <p className="mt-1 text-sm text-slate-500">Akses penuh — estimasi, PDF, template WA, database klien.</p>
            <a
              href={plannerAppPath("/app/estimator")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Buka Estimator <ArrowRight className="h-4 w-4" />
            </a>
          </section>
        )}

        {/* Trial Planner */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Trial Monefyi Planner</h2>
          <p className="mt-1 text-sm text-slate-500">
            Convert penawaran deal → proyek aktif (maks. {PLANNER_TRIAL_MAX_PROJECTS} proyek).
            Proyek aktif: <strong>{activeProjects}</strong> · Slot tersisa:{" "}
            <strong>{trialSlots === Infinity ? "∞" : trialSlots}</strong>
          </p>

          <button
            type="button"
            onClick={handleConvert}
            disabled={!canConvert && !user.ownedProducts.includes("planner")}
            className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Convert Penawaran → Proyek Aktif
          </button>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {LOCKED_FEATURES.map((feature) => {
              const locked = isPlannerFeatureLocked(user, feature);
              return (
                <button
                  key={feature}
                  type="button"
                  onClick={() => handleLockedClick(feature)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                    locked
                      ? "border-slate-200 bg-slate-50 text-slate-500"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {PLANNER_LOCKED_LABELS[feature]}
                  {locked && <Lock className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
