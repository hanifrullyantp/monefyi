/**
 * Helper Meta Graph API untuk budget dan status kampanye.
 * Dipakai bersama oleh apply (eksekusi), review (evaluasi 48 jam) dan undo (pembatalan).
 */
import { buildGraphUrl, extractCandidateTokens } from "@/lib/meta/graph";
import { getServiceClient } from "@/lib/engine/engineDb";

export const MIN_ADSET_BUDGET = 15000;

export interface MetaCreds {
  token: string;
  appSecret?: string;
}

/** Kredensial Meta untuk proses server (cron). Urutan: env, lalu kolom meta_access_token di config. */
export async function resolveServerMetaCreds(): Promise<MetaCreds | null> {
  let raw = process.env.META_ACCESS_TOKEN || "";
  if (!raw) {
    try {
      const { data } = await getServiceClient()
        .from("winning_engine_config")
        .select("meta_access_token")
        .eq("id", "default")
        .maybeSingle();
      raw = String(data?.meta_access_token || "");
    } catch {
      raw = "";
    }
  }
  const tokens = extractCandidateTokens(raw, process.env.META_CAPI_TOKEN || "");
  if (tokens.length === 0) return null;
  return { token: tokens[0], appSecret: (process.env.META_APP_SECRET || "").trim() || undefined };
}

export type LiveBudget =
  | { ok: true; mode: "CBO" | "ABO"; total: number; adsets: { id: string; name: string; daily_budget: number }[] }
  | { ok: false; error: string };

/** Membaca budget riil dari Meta. Scale dan rollback tidak boleh dihitung dari angka tebakan. */
export async function readLiveBudget(objectId: string, token: string, appSecret?: string): Promise<LiveBudget> {
  const campRes = await fetch(
    buildGraphUrl(`https://graph.facebook.com/v20.0/${objectId}?fields=daily_budget,lifetime_budget`, token, appSecret),
    { cache: "no-store" }
  );
  const campJson = await campRes.json().catch(() => ({}));
  if (!campRes.ok || campJson.error) {
    return { ok: false, error: campJson.error?.message || "Gagal membaca budget kampanye dari Meta." };
  }
  const cboDaily = Number(campJson.daily_budget || 0);
  if (cboDaily > 0) return { ok: true, mode: "CBO", total: cboDaily, adsets: [] };

  const adsetsRes = await fetch(
    buildGraphUrl(`https://graph.facebook.com/v20.0/${objectId}/adsets?fields=id,name,daily_budget&limit=50`, token, appSecret),
    { cache: "no-store" }
  );
  const adsetsJson = await adsetsRes.json().catch(() => ({}));
  if (!adsetsRes.ok || adsetsJson.error) {
    return { ok: false, error: adsetsJson.error?.message || "Gagal membaca ad set dari Meta." };
  }
  const adsets = (Array.isArray(adsetsJson.data) ? adsetsJson.data : [])
    .map((a: any) => ({ id: String(a.id), name: String(a.name || a.id), daily_budget: Number(a.daily_budget || 0) }))
    .filter((a: { daily_budget: number }) => a.daily_budget > 0);
  const total = adsets.reduce((s: number, a: { daily_budget: number }) => s + a.daily_budget, 0);
  if (total <= 0) {
    return { ok: false, error: "Budget harian tidak terbaca (kemungkinan memakai Lifetime budget). Dibatalkan." };
  }
  return { ok: true, mode: "ABO", total, adsets };
}

export async function setDailyBudget(
  objectId: string,
  amount: number,
  token: string,
  appSecret?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(buildGraphUrl(`https://graph.facebook.com/v20.0/${objectId}`, token, appSecret), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ daily_budget: String(amount) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) return { ok: false, error: json.error?.message || "Meta menolak perubahan budget." };
  return { ok: true };
}

export async function setObjectStatus(
  objectId: string,
  status: "ACTIVE" | "PAUSED",
  token: string,
  appSecret?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(buildGraphUrl(`https://graph.facebook.com/v20.0/${objectId}`, token, appSecret), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) return { ok: false, error: json.error?.message || "Meta menolak perubahan status." };
  return { ok: true };
}

/**
 * Mengembalikan budget total kampanye ke angka tertentu.
 * CBO: ubah budget kampanye. ABO: skala semua ad set dengan proporsi tetap.
 */
export async function restoreBudget(
  campaignId: string,
  targetTotal: number,
  current: Extract<LiveBudget, { ok: true }>,
  creds: MetaCreds
): Promise<{ ok: boolean; changed: { id: string; from: number; to: number }[]; failures: string[] }> {
  const changed: { id: string; from: number; to: number }[] = [];
  const failures: string[] = [];
  const target = Math.round(targetTotal);
  if (current.mode === "CBO") {
    const r = await setDailyBudget(campaignId, target, creds.token, creds.appSecret);
    if (r.ok) changed.push({ id: campaignId, from: current.total, to: target });
    else failures.push(r.error);
  } else {
    const factor = target / current.total;
    for (const adset of current.adsets) {
      const to = Math.max(MIN_ADSET_BUDGET, Math.round(adset.daily_budget * factor));
      const r = await setDailyBudget(adset.id, to, creds.token, creds.appSecret);
      if (r.ok) changed.push({ id: adset.id, from: adset.daily_budget, to });
      else failures.push(`${adset.name}: ${r.error}`);
    }
  }
  return { ok: failures.length === 0, changed, failures };
}

/** Spend dan pembelian satu kampanye pada rentang tanggal (format YYYY-MM-DD). */
export async function readCampaignWindowMetrics(
  campaignId: string,
  since: string,
  until: string,
  creds: MetaCreds
): Promise<{ ok: true; spend: number; purchases: number } | { ok: false; error: string }> {
  const range = encodeURIComponent(JSON.stringify({ since, until }));
  const res = await fetch(
    buildGraphUrl(
      `https://graph.facebook.com/v20.0/${campaignId}/insights?fields=spend,actions&time_range=${range}`,
      creds.token,
      creds.appSecret
    ),
    { cache: "no-store" }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) return { ok: false, error: json.error?.message || "Gagal membaca insights dari Meta." };
  const row = Array.isArray(json.data) && json.data[0] ? json.data[0] : null;
  if (!row) return { ok: true, spend: 0, purchases: 0 };
  const actions: { action_type: string; value: string }[] = Array.isArray(row.actions) ? row.actions : [];
  // Urutan sama dengan route campaigns agar angka konsisten
  let purchases = 0;
  for (const t of ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]) {
    const f = actions.find((a) => a.action_type === t);
    if (f) {
      purchases = Number(f.value || 0);
      break;
    }
  }
  return { ok: true, spend: Number(row.spend || 0), purchases };
}
