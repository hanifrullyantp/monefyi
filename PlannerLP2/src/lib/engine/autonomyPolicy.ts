/**
 * Kebijakan otonomi: seberapa jauh Expert boleh bertindak sendiri untuk tiap jenis aksi.
 * Murni (tanpa I/O). Default aman, bisa diubah dari dashboard.
 */

export type AutonomyLevel = "auto" | "approve" | "recommend";

export type PolicyAction =
  | "pause_campaign"
  | "pause_weak_ad"
  | "scale_budget"
  | "duplicate_winner"
  | "create_ad"
  | "create_campaign"
  | "change_offer"
  | "change_lp_copy";

export type AutonomyPolicy = Record<PolicyAction, AutonomyLevel>;

export const DEFAULT_AUTONOMY_POLICY: AutonomyPolicy = {
  pause_campaign: "auto",
  pause_weak_ad: "auto",
  scale_budget: "auto",
  duplicate_winner: "auto",
  create_ad: "auto",
  create_campaign: "approve",
  change_offer: "approve",
  change_lp_copy: "approve",
};

export const POLICY_LABEL: Record<PolicyAction, { title: string; detail: string; implemented: boolean }> = {
  pause_campaign: { title: "Pause kampanye boncos", detail: "Hanya jika peluang rugi tinggi dan di luar learning phase.", implemented: true },
  pause_weak_ad: { title: "Pause iklan lemah", detail: "Iklan terbukti merugi, bukan satu-satunya di ad set, dan tidak sedang learning.", implemented: true },
  scale_budget: { title: "Naikkan budget pemenang", detail: "Maks per langkah sesuai pengaturan, dengan jeda cooldown.", implemented: true },
  duplicate_winner: { title: "Duplikasi ad set pemenang", detail: "Salinan selalu dibuat PAUSED. Mengaktifkannya selalu butuh persetujuan Anda.", implemented: true },
  create_ad: { title: "Buat iklan baru dari aset Anda", detail: "Dibuat PAUSED memakai gambar/video yang sudah ada di akun dan varian copy angle menang.", implemented: true },
  create_campaign: { title: "Buat kampanye baru", detail: "Kampanye rapid testing dibuat dalam status PAUSED sesuai batas harian.", implemented: true },
  change_offer: { title: "Ubah harga / offer", detail: "Selalu butuh persetujuan Anda.", implemented: true },
  change_lp_copy: { title: "Ubah teks landing page", detail: "Selalu dengan pratinjau sebelum/sesudah menuju database landing page.", implemented: true },
};

const LEVELS: AutonomyLevel[] = ["auto", "approve", "recommend"];

/** Gabungkan nilai tersimpan dengan default. Nilai tak valid diabaikan. */
export function resolvePolicy(stored: unknown): AutonomyPolicy {
  const out: AutonomyPolicy = { ...DEFAULT_AUTONOMY_POLICY };
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const key of Object.keys(DEFAULT_AUTONOMY_POLICY) as PolicyAction[]) {
      const v = (stored as Record<string, unknown>)[key];
      if (typeof v === "string" && (LEVELS as string[]).includes(v)) out[key] = v as AutonomyLevel;
    }
  }
  // Perubahan harga tidak pernah boleh otomatis.
  if (out.change_offer === "auto") out.change_offer = "approve";
  return out;
}

export function policyActionForPlan(actionType: string): PolicyAction | null {
  switch (actionType) {
    case "pause_bleeding_campaign": return "pause_campaign";
    case "scale_campaign_budget": return "scale_budget";
    case "update_offer_pricing": return "change_offer";
    case "update_lp_copy": return "change_lp_copy";
    case "create_rapid_test_campaign": return "create_campaign";
    case "create_ad_variant": return "create_ad";
    default: return null;
  }
}

/** True bila kebijakan mengizinkan eksekusi mandiri untuk tipe aksi ini. */
export function policyAllowsAuto(policy: AutonomyPolicy, actionType: string): boolean {
  const key = policyActionForPlan(actionType);
  return key !== null && policy[key] === "auto";
}

