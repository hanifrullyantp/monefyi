import { graphFetchJson } from "@/lib/meta/graph";
import { getServiceClient } from "@/lib/engine/engineDb";
import type { MetaCreds } from "@/lib/engine/metaBudget";

/**
 * Pengambil data iklan level ad dari Meta (kreatif, copy, metrik, deret harian).
 * Nama field ditulis dari pengetahuan Graph API v20 dan BELUM diuji ke akun nyata:
 * kegagalan satu bagian dicatat di `warnings` dan tidak menggagalkan seluruh analisa.
 */

export interface AdDaily {
  date: string;
  impressions: number;
  linkClicks: number;
  ctr: number;
  frequency: number;
}

export interface AdRecord {
  id: string;
  name: string;
  adsetId: string;
  campaignId: string;
  effectiveStatus: string;
  title: string;
  body: string;
  imageUrl: string;
  isVideo: boolean;
  callToAction: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  linkCtr: number; // persen
  frequency: number;
  purchases: number;
  revenue: number;
  video3s: number;
  thruplays: number;
  daily: AdDaily[];
}

export interface AdsDataset {
  ok: boolean;
  actId: string;
  ads: AdRecord[];
  /** adset yang sedang learning, menurut Meta */
  learningAdsets: string[];
  warnings: string[];
  error?: string;
}

const PURCHASE_TYPES = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];

function pickAction(list: any, types: string[]): number {
  if (!Array.isArray(list)) return 0;
  for (const t of types) {
    const hit = list.find((a: any) => a?.action_type === t);
    if (hit) return Number(hit.value || 0);
  }
  return 0;
}

export function sumFirst(list: any): number {
  return Array.isArray(list) && list[0] ? Number(list[0].value || 0) : 0;
}

export async function resolveActId(creds: MetaCreds): Promise<string | null> {
  let raw = "";
  try {
    const { data } = await getServiceClient().from("winning_engine_config").select("ad_account_id").eq("id", "default").maybeSingle();
    raw = String(data?.ad_account_id || "").trim();
  } catch {
    raw = "";
  }
  if (!raw) {
    const r = await graphFetchJson("https://graph.facebook.com/v20.0/me/adaccounts?fields=id&limit=5", creds.token, undefined, creds.appSecret);
    raw = String(r.data?.data?.[0]?.id || "");
  }
  if (!raw) return null;
  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

export async function fetchAdsDataset(creds: MetaCreds, windowDays = 7): Promise<AdsDataset> {
  const warnings: string[] = [];
  const actId = await resolveActId(creds);
  if (!actId) return { ok: false, actId: "", ads: [], learningAdsets: [], warnings, error: "Ad account tidak ditemukan." };
  const base = `https://graph.facebook.com/v20.0/${actId}`;
  const preset = windowDays <= 7 ? "last_7d" : "last_14d";
  const insightFields = "ad_id,spend,impressions,frequency,inline_link_clicks,inline_link_click_ctr,actions,action_values,video_thruplay_watched_actions";

  const [adsRes, insRes, dailyRes, adsetRes] = await Promise.all([
    graphFetchJson(`${base}/ads?fields=id,name,adset_id,campaign_id,effective_status,creative{id,title,body,image_url,thumbnail_url,video_id,call_to_action_type}&limit=200`, creds.token, undefined, creds.appSecret),
    graphFetchJson(`${base}/insights?level=ad&date_preset=${preset}&fields=${insightFields}&limit=500`, creds.token, undefined, creds.appSecret),
    graphFetchJson(`${base}/insights?level=ad&date_preset=${preset}&time_increment=1&fields=ad_id,impressions,frequency,inline_link_clicks,inline_link_click_ctr&limit=500`, creds.token, undefined, creds.appSecret),
    graphFetchJson(`${base}/adsets?fields=id,learning_stage_info&limit=200`, creds.token, undefined, creds.appSecret),
  ]);

  if (!adsRes.ok) {
    return { ok: false, actId, ads: [], learningAdsets: [], warnings, error: adsRes.data?.error?.message || "Gagal membaca daftar iklan." };
  }
  if (!insRes.ok) warnings.push(`Insight iklan gagal: ${insRes.data?.error?.message || "tidak diketahui"}`);
  if (!dailyRes.ok) warnings.push("Deret harian gagal dibaca, deteksi fatigue dilewati.");

  const learningAdsets: string[] = [];
  if (adsetRes.ok && Array.isArray(adsetRes.data?.data)) {
    for (const s of adsetRes.data.data) if (s?.learning_stage_info?.status === "LEARNING") learningAdsets.push(String(s.id));
  } else warnings.push("Status learning ad set tidak terbaca, iklan tidak dipause otomatis.");

  const insBy = new Map<string, any>((insRes.data?.data || []).map((r: any) => [String(r.ad_id), r]));
  const dailyBy = new Map<string, AdDaily[]>();
  for (const r of dailyRes.data?.data || []) {
    const id = String(r.ad_id);
    const arr = dailyBy.get(id) || [];
    arr.push({
      date: String(r.date_start || ""),
      impressions: Number(r.impressions || 0),
      linkClicks: Number(r.inline_link_clicks || 0),
      ctr: Number(r.inline_link_click_ctr || 0),
      frequency: Number(r.frequency || 0),
    });
    dailyBy.set(id, arr);
  }

  const ads: AdRecord[] = (adsRes.data?.data || []).map((a: any) => {
    const ins = insBy.get(String(a.id)) || {};
    const c = a.creative || {};
    return {
      id: String(a.id),
      name: String(a.name || ""),
      adsetId: String(a.adset_id || ""),
      campaignId: String(a.campaign_id || ""),
      effectiveStatus: String(a.effective_status || ""),
      title: String(c.title || ""),
      body: String(c.body || ""),
      imageUrl: String(c.image_url || c.thumbnail_url || ""),
      isVideo: Boolean(c.video_id),
      callToAction: String(c.call_to_action_type || ""),
      spend: Number(ins.spend || 0),
      impressions: Number(ins.impressions || 0),
      linkClicks: Number(ins.inline_link_clicks || 0),
      linkCtr: Number(ins.inline_link_click_ctr || 0),
      frequency: Number(ins.frequency || 0),
      purchases: pickAction(ins.actions, PURCHASE_TYPES),
      revenue: pickAction(ins.action_values, PURCHASE_TYPES),
      video3s: pickAction(ins.actions, ["video_view"]),
      thruplays: sumFirst(ins.video_thruplay_watched_actions),
      daily: (dailyBy.get(String(a.id)) || []).sort((x, y) => x.date.localeCompare(y.date)),
    };
  });

  return { ok: true, actId, ads, learningAdsets, warnings };
}

