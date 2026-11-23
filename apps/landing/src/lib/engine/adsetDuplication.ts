import { graphFetchJson } from "@/lib/meta/graph";
import { getServiceClient } from "@/lib/engine/engineDb";
import type { MetaCreds } from "@/lib/engine/metaBudget";

/**
 * Duplikasi ad set pemenang. Salinan SELALU dibuat PAUSED: tidak ada belanja baru sampai
 * admin mengaktifkannya. Endpoint /copies ditulis dari pengetahuan Graph API v20 dan belum
 * dicoba di akun Anda.
 */

export async function duplicateAdsetPaused(
  adsetId: string,
  creds: MetaCreds
): Promise<{ ok: true; copiedAdsetId: string } | { ok: false; error: string }> {
  const r = await graphFetchJson(
    `https://graph.facebook.com/v20.0/${adsetId}/copies`,
    creds.token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deep_copy: true,
        status_option: "PAUSED",
        rename_options: { rename_suffix: " - Salinan Expert" },
      }),
    },
    creds.appSecret,
    0 // jangan retry otomatis: salinan ganda lebih buruk daripada gagal
  );
  if (!r.ok) return { ok: false, error: r.data?.error?.message || "Meta menolak duplikasi." };
  const id = String(r.data?.copied_adset_id || r.data?.ad_object_ids?.[0]?.copied_id || "");
  if (!id) return { ok: false, error: "Meta tidak mengembalikan ID salinan." };
  return { ok: true, copiedAdsetId: id };
}

/** Ad set yang sudah diduplikasi engine dalam N hari terakhir (agar tidak menyalin berulang). */
export async function loadRecentlyDuplicated(days = 7): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data } = await getServiceClient()
      .from("engine_action_log")
      .select("campaign_id")
      .eq("action_type", "duplicate_winner")
      .eq("live_executed", true)
      .gte("created_at", since);
    for (const r of data || []) if (r.campaign_id) out.add(String(r.campaign_id));
  } catch {
    // tanpa riwayat: pemanggil tetap dibatasi satu salinan per run
  }
  return out;
}

/** Salinan yang boleh diaktifkan admin: harus tercatat dibuat engine dalam 14 hari terakhir. */
export async function findDuplicateLog(copiedAdsetId: string): Promise<{ id: number; name: string } | null> {
  try {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data } = await getServiceClient()
      .from("engine_action_log")
      .select("id, campaign_name, response")
      .eq("action_type", "duplicate_winner")
      .eq("live_executed", true)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);
    const hit = (data || []).find((r: any) => String(r.response?.copiedAdsetId) === copiedAdsetId);
    return hit ? { id: Number(hit.id), name: String(hit.campaign_name || "") } : null;
  } catch {
    return null;
  }
}

export async function readAdsetDailyBudget(adsetId: string, creds: MetaCreds): Promise<number | null> {
  const r = await graphFetchJson(`https://graph.facebook.com/v20.0/${adsetId}?fields=daily_budget`, creds.token, undefined, creds.appSecret);
  if (!r.ok) return null;
  const n = Number(r.data?.daily_budget || 0);
  return n > 0 ? n : null;
}

