import type { LucideIcon } from "lucide-react";
import { Calculator, PieChart, Wallet, Banknote, Landmark, Coins, Scale } from "lucide-react";

const EMBED_PREFIX = "/bonus/mini";

/** Prefix deploy terpisah (CDN/subdomain). Abaikan legacy `monefyi.com/bonus` — tidak pernah di-host. */
function resolveExternalBonusBase(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_BONUS_APPS_BASE_URL?.trim().replace(/\/$/, "");
  if (!raw) return undefined;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/$/, "") || "";
    const isLegacyMarketingBonus =
      (host === "monefyi.com" || host === "www.monefyi.com") && (path === "" || path === "/bonus");
    if (isLegacyMarketingBonus) return undefined;
    return raw.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

const EXTERNAL_BASE = resolveExternalBonusBase();

export type BonusAppId =
  | "budget"
  | "debt-free"
  | "bagi-hasil"
  | "salary"
  | "cicilan"
  | "zakat"
  | "waris";

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
  {
    id: "zakat",
    name: "Kalkulator Zakat",
    description: "Hitung 7 jenis zakat (Penghasilan, Maal, Emas, Perdagangan, Pertanian, Fitrah) sesuai fatwa MUI.",
    valueLabel: "Rp 199.000",
    path: "zakat",
    icon: Coins,
    color: "emerald",
  },
  {
    id: "cicilan",
    name: "Kalkulator Cicilan",
    description: "Simulasikan angsuran KPR, KKB, KTA dengan jadwal amortisasi & komparator bunga.",
    valueLabel: "Rp 199.000",
    path: "cicilan",
    icon: Landmark,
    color: "blue",
  },
  {
    id: "waris",
    name: "Hitung Waris",
    description: "Hitung pembagian harta warisan (Faraid) secara akurat sesuai syariat Islam.",
    valueLabel: "Rp 199.000",
    path: "waris",
    icon: Scale,
    color: "violet",
  },
];

/** Halaman utama (hindari redirect server di static export). */
const EMBED_ENTRY: Partial<Record<BonusAppId, string>> = {
  budget: "budget-planner",
  "bagi-hasil": "kalkulator-bagi-hasil",
  waris: "hitung-waris",
};

export function bonusAppUrl(app: BonusAppDef): string {
  const entry = EMBED_ENTRY[app.id];
  const segment = entry ? `${app.path}/${entry}` : app.path;
  if (EXTERNAL_BASE) {
    return `${EXTERNAL_BASE}/${segment}/`;
  }
  return `${EMBED_PREFIX}/${segment}/index.html`;
}
