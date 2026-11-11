import { NextRequest, NextResponse } from "next/server";
import { extractCandidateTokens, buildGraphUrl } from "@/lib/meta/graph";

export interface MetaActionLogEntry {
  id: string;
  timestamp: string;
  actor: "human" | "ai_bima" | "ai_danu" | "ai_sinta" | "ai_aris";
  actorLabel: string;
  actionType: "update_status" | "update_budget" | "scale_budget" | "create_campaign";
  campaignId: string;
  campaignName: string;
  summary: string;
  previousValue?: string | number;
  newValue?: string | number;
  liveExecuted: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawAccessToken = body.accessToken || process.env.META_ACCESS_TOKEN || "";
    const rawCapiToken = body.capiAccessToken || process.env.META_CAPI_TOKEN || "";
    const adAccountIdRaw = (body.adAccountId || process.env.META_AD_ACCOUNT_ID || "").trim();
    const appSecret = (body.appSecret || process.env.META_APP_SECRET || "").trim() || undefined;

    const action: string = body.action || "";
    const campaignId: string = String(body.campaignId || "").trim();
    const campaignName: string = String(body.campaignName || campaignId || "Kampanye Meta");
    const actor = body.actor || "human";
    const actorLabel =
      body.actorLabel ||
      (actor === "ai_bima"
        ? "Bima (AI Media Buyer)"
        : actor === "ai_danu"
        ? "Mas Danu (AI CMO)"
        : "Admin (Manual)");

    const candidateTokens = extractCandidateTokens(rawAccessToken, rawCapiToken);
    if (candidateTokens.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Access Token Meta belum terpasang. Hubungkan token terlebih dahulu di Konfigurasi.",
        },
        { status: 400 }
      );
    }

    const token = candidateTokens[0];
    const cleanActId = adAccountIdRaw.replace(/^act_/i, "").replace(/[^0-9]/g, "");
    const actId = cleanActId ? `act_${cleanActId}` : "";

    // 1. Aksi Ubah Status (Campaign / AdSet / Ad: ACTIVE / PAUSED)
    if (action === "update_status") {
      const newStatus = body.status === "ACTIVE" ? "ACTIVE" : "PAUSED";
      const targetType: "ad" | "adset" | "campaign" =
        body.targetType || (body.adId ? "ad" : body.adsetId ? "adset" : "campaign");
      const targetId = String(body.targetId || body.adId || body.adsetId || campaignId || "").trim();
      const targetName = String(
        body.targetName || body.adName || body.adsetName || campaignName || targetId || "Item Meta"
      );

      if (!targetId) {
        return NextResponse.json(
          { ok: false, error: "targetId / adId / campaignId wajib diisi." },
          { status: 400 }
        );
      }

      const url = buildGraphUrl(`https://graph.facebook.com/v20.0/${targetId}`, token, appSecret);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              data.error?.message ||
              `Gagal mengubah status ${targetType.toUpperCase()} ke ${newStatus} di Meta Graph API.`,
            rawMetaError: data.error,
          },
          { status: 400 }
        );
      }

      const typeLabel = targetType === "ad" ? "Ad/Iklan" : targetType === "adset" ? "AdSet" : "Kampanye";

      return NextResponse.json({
        ok: true,
        liveExecuted: true,
        targetId,
        targetType,
        adId: targetType === "ad" ? targetId : undefined,
        campaignId: campaignId || targetId,
        newStatus,
        log: {
          id: `act_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor,
          actorLabel,
          actionType: "update_status",
          campaignId: campaignId || targetId,
          campaignName: targetName,
          summary: `${actorLabel} mengubah status ${typeLabel} "${targetName}" menjadi ${newStatus} di Meta Ads.`,
          newValue: newStatus,
          liveExecuted: true,
        } satisfies MetaActionLogEntry,
      });
    }

    // 2. Aksi Ubah Budget / Scale Up Budget (Otomatis deteksi Campaign CBO vs AdSet ABO)
    if (action === "update_budget" || action === "scale_budget") {
      if (!campaignId) {
        return NextResponse.json({ ok: false, error: "campaignId wajib diisi." }, { status: 400 });
      }

      const targetBudget = Math.max(20000, Math.round(Number(body.dailyBudget || 0)));
      const previousBudget = Number(body.previousBudget || 0);

      // 2a. Coba update di level Campaign (jika menggunakan Advantage+ Campaign Budget / CBO)
      const campUrl = buildGraphUrl(`https://graph.facebook.com/v20.0/${campaignId}`, token, appSecret);
      const campRes = await fetch(campUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_budget: targetBudget }),
      });
      const campData = await campRes.json().catch(() => ({}));

      if (campRes.ok && !campData.error) {
        return NextResponse.json({
          ok: true,
          liveExecuted: true,
          level: "campaign_cbo",
          campaignId,
          dailyBudget: targetBudget,
          log: {
            id: `act_${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor,
            actorLabel,
            actionType: action === "scale_budget" ? "scale_budget" : "update_budget",
            campaignId,
            campaignName,
            summary: `${actorLabel} memperbarui budget harian CBO "${campaignName}" menjadi Rp ${targetBudget.toLocaleString("id-ID")}.`,
            previousValue: previousBudget,
            newValue: targetBudget,
            liveExecuted: true,
          } satisfies MetaActionLogEntry,
        });
      }

      // 2b. Jika budget dikelola di level AdSet (ABO), ambil daftar AdSet milik kampanye ini lalu update AdSet-nya
      const adsetsUrl = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${campaignId}/adsets?fields=id,name,daily_budget,status&limit=25`,
        token,
        appSecret
      );
      const adsetsRes = await fetch(adsetsUrl, { cache: "no-store" });
      const adsetsData = await adsetsRes.json().catch(() => ({}));
      const adsetsList: any[] = Array.isArray(adsetsData.data) ? adsetsData.data : [];

      if (adsetsList.length > 0) {
        const activeAdsets = adsetsList.filter((a) => a.status === "ACTIVE");
        const targets = activeAdsets.length > 0 ? activeAdsets : [adsetsList[0]];
        const budgetPerAdset = Math.max(20000, Math.round(targetBudget / targets.length));

        let updatedAdsetCount = 0;
        let lastAdsetErr: any = null;

        for (const adset of targets) {
          const updateAdsetUrl = buildGraphUrl(
            `https://graph.facebook.com/v20.0/${adset.id}`,
            token,
            appSecret
          );
          const uRes = await fetch(updateAdsetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ daily_budget: budgetPerAdset }),
          });
          const uData = await uRes.json().catch(() => ({}));
          if (uRes.ok && !uData.error) {
            updatedAdsetCount++;
          } else {
            lastAdsetErr = uData.error;
          }
        }

        if (updatedAdsetCount > 0) {
          return NextResponse.json({
            ok: true,
            liveExecuted: true,
            level: "adset_abo",
            campaignId,
            dailyBudget: targetBudget,
            log: {
              id: `act_${Date.now()}`,
              timestamp: new Date().toISOString(),
              actor,
              actorLabel,
              actionType: action === "scale_budget" ? "scale_budget" : "update_budget",
              campaignId,
              campaignName,
              summary: `${actorLabel} menaikkan/mengubah budget ABO (${updatedAdsetCount} AdSet) pada "${campaignName}" menjadi total Rp ${targetBudget.toLocaleString("id-ID")}/hari.`,
              previousValue: previousBudget,
              newValue: targetBudget,
              liveExecuted: true,
            } satisfies MetaActionLogEntry,
          });
        }

        return NextResponse.json(
          {
            ok: false,
            error:
              lastAdsetErr?.message ||
              campData.error?.message ||
              "Gagal memperbarui budget pada AdSet Meta.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: campData.error?.message || "Gagal memperbarui budget di Meta Graph API.",
        },
        { status: 400 }
      );
    }

    // 3. Aksi Buat Draft Kampanye Winning Baru di Meta Ads Manager
    if (action === "create_winning_campaign") {
      if (!actId) {
        return NextResponse.json(
          { ok: false, error: "Ad Account ID wajib diisi untuk membuat kampanye baru." },
          { status: 400 }
        );
      }

      const newName =
        body.name || `[MONEFYI WINNING DRAFT] ${new Date().toLocaleDateString("id-ID")}`;
      const objective = body.objective || "OUTCOME_SALES";
      const dailyBudget = Math.max(50000, Math.round(Number(body.dailyBudget || 150000)));

      const createUrl = buildGraphUrl(
        `https://graph.facebook.com/v20.0/${actId}/campaigns`,
        token,
        appSecret
      );

      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          objective,
          status: "PAUSED",
          special_ad_categories: [],
          daily_budget: dailyBudget,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));

      if (!createRes.ok || createData.error) {
        // Coba ulangi tanpa daily_budget di level campaign jika akun mewajibkan budget di AdSet
        const retryRes = await fetch(createUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            objective,
            status: "PAUSED",
            special_ad_categories: ["NONE"],
          }),
        });
        const retryData = await retryRes.json().catch(() => ({}));

        if (!retryRes.ok || retryData.error) {
          return NextResponse.json(
            {
              ok: false,
              error:
                retryData.error?.message ||
                createData.error?.message ||
                "Gagal membuat draft kampanye baru di Meta Ads Manager.",
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          ok: true,
          liveExecuted: true,
          createdCampaignId: retryData.id,
          name: newName,
          log: {
            id: `act_${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor,
            actorLabel,
            actionType: "create_campaign",
            campaignId: String(retryData.id),
            campaignName: newName,
            summary: `${actorLabel} membuat draft kampanye winning baru "${newName}" (ID: ${retryData.id}) di Meta Ads Manager.`,
            newValue: dailyBudget,
            liveExecuted: true,
          } satisfies MetaActionLogEntry,
        });
      }

      return NextResponse.json({
        ok: true,
        liveExecuted: true,
        createdCampaignId: createData.id,
        name: newName,
        log: {
          id: `act_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor,
          actorLabel,
          actionType: "create_campaign",
          campaignId: String(createData.id),
          campaignName: newName,
          summary: `${actorLabel} membuat draft kampanye winning baru "${newName}" (ID: ${createData.id}, Budget: Rp ${dailyBudget.toLocaleString("id-ID")}) di Meta Ads Manager.`,
          newValue: dailyBudget,
          liveExecuted: true,
        } satisfies MetaActionLogEntry,
      });
    }

    return NextResponse.json(
      { ok: false, error: `Action "${action}" tidak dikenali.` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Meta Actions API Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal mengeksekusi perintah ke Meta Graph API." },
      { status: 500 }
    );
  }
}

