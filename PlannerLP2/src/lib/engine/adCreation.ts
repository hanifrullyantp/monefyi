/**
 * Fase 3 Executor: Membuat varian iklan baru (creative + ad) dari aset yang SUDAH ADA di akun Meta
 * dan varian copy dari copyAnalyzer/creativeCritic.
 * Keamanan: iklan SELALU dibuat dalam status PAUSED (tidak ada belanja baru sampai admin mengaktifkannya).
 */
import { graphFetchJson } from "@/lib/meta/graph";
import { getServiceClient, wibDate } from "@/lib/engine/engineDb";
import type { MetaCreds } from "@/lib/engine/metaBudget";

export interface ExistingCreativeTemplate {
  pageId: string;
  imageHash: string;
  instagramUserId?: string;
  linkUrl: string;
  sourceAdId?: string;
}

export async function findTemplateCreative(input: {
  actId: string;
  adsetId?: string;
  creds: MetaCreds;
}): Promise<{ ok: true; template: ExistingCreativeTemplate } | { ok: false; error: string }> {
  const { actId, adsetId, creds } = input;
  const act = actId.startsWith("act_") ? actId : `act_${actId}`;
  const adsRes = await graphFetchJson(
    `https://graph.facebook.com/v20.0/${act}/ads?fields=id,adset_id,effective_status,creative{id,image_hash,object_story_spec}&limit=100`,
    creds.token,
    undefined,
    creds.appSecret
  );
  if (!adsRes.ok) {
    return { ok: false, error: adsRes.data?.error?.message || "Gagal membaca aset kreatif dari Meta." };
  }

  const ads: any[] = Array.isArray(adsRes.data?.data) ? adsRes.data.data : [];
  // Prioritaskan iklan di adset yang sama, lalu iklan ACTIVE, lalu iklan mana saja yang punya page_id + image_hash
  const prioritized = [
    ...ads.filter((a) => adsetId && String(a.adset_id) === adsetId),
    ...ads.filter((a) => String(a.effective_status) === "ACTIVE"),
    ...ads,
  ];

  let pageId = "";
  let imageHash = "";
  let instagramUserId = "";
  let linkUrl = "https://estimator.monefyi.com/";
  let sourceAdId = "";

  for (const ad of prioritized) {
    const cr = ad?.creative || {};
    const spec = cr.object_story_spec || {};
    const pId = String(spec.page_id || "").trim();
    const linkData = spec.link_data || spec.video_data || {};
    const iHash = String(linkData.image_hash || cr.image_hash || "").trim();
    const lUrl = String(linkData.link || linkData?.call_to_action?.value?.link || "").trim();
    if (pId && !pageId) pageId = pId;
    if (spec.instagram_user_id && !instagramUserId) instagramUserId = String(spec.instagram_user_id);
    if (lUrl && lUrl.startsWith("http")) linkUrl = lUrl;
    if (iHash && !imageHash) {
      imageHash = iHash;
      sourceAdId = String(ad.id || "");
    }
    if (pageId && imageHash) break;
  }

  // Fallback: cari image_hash dari galeri adimages akun bila object_story_spec tidak memuatnya
  if (!imageHash) {
    const imgRes = await graphFetchJson(
      `https://graph.facebook.com/v20.0/${act}/adimages?fields=hash,name&limit=10`,
      creds.token,
      undefined,
      creds.appSecret
    );
    const firstHash = imgRes.ok && Array.isArray(imgRes.data?.data) ? String(imgRes.data.data[0]?.hash || "") : "";
    if (firstHash) imageHash = firstHash;
  }

  if (!pageId) {
    return { ok: false, error: "Page ID Facebook belum ditemukan dari iklan sebelumnya di akun ini." };
  }
  if (!imageHash) {
    return { ok: false, error: "Belum ada aset gambar (image_hash) terunggah di akun Meta ini." };
  }

  return {
    ok: true,
    template: {
      pageId,
      imageHash,
      instagramUserId: instagramUserId || undefined,
      linkUrl,
      sourceAdId: sourceAdId || undefined,
    },
  };
}

export async function createPausedAdVariant(input: {
  actId: string;
  adsetId: string;
  name: string;
  headline: string;
  primaryText: string;
  template: ExistingCreativeTemplate;
  creds: MetaCreds;
}): Promise<{ ok: true; adId: string; creativeId: string } | { ok: false; error: string }> {
  const act = input.actId.startsWith("act_") ? input.actId : `act_${input.actId}`;
  const spec: Record<string, unknown> = {
    page_id: input.template.pageId,
    link_data: {
      link: input.template.linkUrl,
      message: input.primaryText,
      name: input.headline.slice(0, 80),
      image_hash: input.template.imageHash,
      call_to_action: {
        type: "LEARN_MORE",
        value: { link: input.template.linkUrl },
      },
    },
  };
  if (input.template.instagramUserId) {
    spec.instagram_user_id = input.template.instagramUserId;
  }

  const crRes = await graphFetchJson(
    `https://graph.facebook.com/v20.0/${act}/adcreatives`,
    input.creds.token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${input.name} [Creative]`,
        object_story_spec: spec,
      }),
    },
    input.creds.appSecret,
    0
  );
  if (!crRes.ok || !crRes.data?.id) {
    return { ok: false, error: crRes.data?.error?.message || "Meta menolak pembuatan adcreative baru." };
  }
  const creativeId = String(crRes.data.id);

  const adRes = await graphFetchJson(
    `https://graph.facebook.com/v20.0/${act}/ads`,
    input.creds.token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        adset_id: input.adsetId,
        creative: { creative_id: creativeId },
        status: "PAUSED",
      }),
    },
    input.creds.appSecret,
    0
  );
  if (!adRes.ok || !adRes.data?.id) {
    return { ok: false, error: adRes.data?.error?.message || "Meta menolak pembuatan iklan baru." };
  }
  return { ok: true, adId: String(adRes.data.id), creativeId };
}

/** Hitung jumlah iklan baru yang dibuat engine hari ini (WIB) untuk membatasi spam. */
export async function countCreatedAdsToday(): Promise<number> {
  try {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const todayPrefix = `create_ad:`;
    const todaySuffix = `:${wibDate()}`;
    const { data } = await getServiceClient()
      .from("engine_action_log")
      .select("idempotency_key")
      .in("action_type", ["create_ad", "create_ad_variant"])
      .eq("live_executed", true)
      .gte("created_at", since);
    return (data || []).filter((r: any) => {
      const k = String(r.idempotency_key || "");
      return (k.startsWith(todayPrefix) || k.startsWith("create_ad_variant:")) && k.endsWith(todaySuffix);
    }).length;
  } catch {
    return 0;
  }
}

/** Iklan PAUSED yang boleh diaktifkan admin: tercatat dibuat engine dalam 14 hari terakhir. */
export async function findCreatedAdLog(adId: string): Promise<{ id: number; name: string } | null> {
  try {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data } = await getServiceClient()
      .from("engine_action_log")
      .select("id, campaign_name, response")
      .in("action_type", ["create_ad", "create_ad_variant"])
      .eq("live_executed", true)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);
    const hit = (data || []).find((r: any) => String(r.response?.createdAdId) === adId);
    return hit ? { id: Number(hit.id), name: String(hit.campaign_name || "") } : null;
  } catch {
    return null;
  }
}
