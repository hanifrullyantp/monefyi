import type { LucideIcon } from "lucide-react";
import { Calculator, PieChart, Wallet, Banknote } from "lucide-react";

/** Override penuh (mis. deploy terpisah di subdomain); kosong = embed same-origin */
const EXTERNAL_BASE = process.env.NEXT_PUBLIC_BONUS_APPS_BASE_URL?.replace(/\/$/, "");

const EMBED_PREFIX = "/bonus/mini";

export type BonusAppId = "budget" | "debt-free" | "bagi-hasil" | "salary";

export type BonusAppDef = {
  id: BonusAppId;
  name: string;
  description: string;
  valueLabel: string;
  path: string;
  icon: LucideIcon;
  color: "emerald" | "violet" | "blue" | "amber";
};

/** Selaras `PlannerLP2/public/bonus/mini/{slug}/` dari script build-bonus-mini.sh */
export const BONUS_APPS: BonusAppDef[] = [
  {
    id: "budget",
    name: "Budget Planner",
    description: "Susun anggaran bulanan dan rencanakan keuangan dengan metode budgeting interaktif.",
    valueLabel: "Rp 199.000",
    path: "budget",
    icon: Wallet,
    color: "emerald",
  },
  {
    id: "debt-free",
    name: "Debt Free Planner",
    description: "Buat strategi pelunasan utang dan pantau perjalanan menuju bebas utang.",
    valueLabel: "Rp 199.000",
    path: "debt-free",
    icon: PieChart,
    color: "violet",
  },
  {
    id: "bagi-hasil",
    name: "Kalkulator Bagi Hasil",
    description: "Simulasikan pembagian hasil Mudharabah, Musyarakah, dan akad lainnya.",
    valueLabel: "Rp 199.000",
    path: "bagi-hasil",
    icon: Calculator,
    color: "blue",
  },
  {
    id: "salary",
    name: "Kalkulator Gaji & PPh21",
    description: "Hitung take-home pay dan PPh21 TER dengan slip gaji otomatis.",
    valueLabel: "Rp 199.000",
    path: "salary",
    icon: Banknote,
    color: "amber",
  },
];

/** Halaman utama (hindari redirect server di static export). */
const EMBED_ENTRY: Partial<Record<BonusAppId, string>> = {
  budget: "budget-planner",
  "bagi-hasil": "kalkulator-bagi-hasil",
};

export function bonusAppUrl(app: BonusAppDef): string {
  const entry = EMBED_ENTRY[app.id];
  const segment = entry ? `${app.path}/${entry}` : app.path;
  if (EXTERNAL_BASE) {
    return `${EXTERNAL_BASE}/${segment}/`;
  }
  return `${EMBED_PREFIX}/${segment}/`;
}
