import type { LucideIcon } from "lucide-react";
import { Calculator, PieChart, Wallet, Banknote } from "lucide-react";

const BASE =
  (process.env.NEXT_PUBLIC_BONUS_APPS_BASE_URL || "https://monefyi.com/bonus").replace(/\/$/, "");

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

/** Selaras folder `Mini App Monefyi/` + deploy path /bonus/{slug}/ */
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

export function bonusAppUrl(app: BonusAppDef): string {
  return `${BASE}/${app.path}/`;
}
