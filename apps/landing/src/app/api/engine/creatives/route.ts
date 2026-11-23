import { NextRequest, NextResponse } from "next/server";
import { requireEngineAuth, isCronRequest } from "@/lib/auth/adminGuard";
import { getServiceClient, acquireRunLock, releaseRunLock, logEngineAction, hasSucceededToday, wibDate, loadUserHolds, checkManualLiveChange } from "@/lib/engine/engineDb";
import { duplicateAdsetPaused, loadRecentlyDuplicated, findDuplicateLog, readAdsetDailyBudget } from "@/lib/engine/adsetDuplication";
import { findTemplateCreative, createPausedAdVariant, countCreatedAdsToday, findCreatedAdLog } from "@/lib/engine/adCreation";
import { loadDbEngineSettings } from "@/lib/engine/engineConfigDb";
import { resolveServerMetaCreds, setObjectStatus } from "@/lib/engine/metaBudget";
import { fetchAdsDataset } from "@/lib/engine/adCreativeData";
import { analyzeAds, pickDuplicateCandidate, type AdAnalysis } from "@/lib/engine/creativeAnalyzer";
import { analyzeAdCopyVariants } from "@/lib/engine/copyAnalyzer";
import { critiqueAd, type CreativeCritique } from "@/lib/engine/creativeCritic";
import { recordEngineLearning } from "@/lib/engine/learnings";
import { DEFAULT_WINNING_ENGINE_CONFIG, type WinningEngineConfig } from "@/lib/engine/winningEngine";
import { sendAdminPush } from "@/lib/engine/pushNotify";
import { filterTracked } from "@/lib/engine/trackedCampaigns";

/**
 * Analisa kreatif dan copy iklan.
 * - GET admin: laporan terakhir. GET cron (Vercel Cron): jalankan analisa.
 * - POST: jalankan analisa. body.critique=true menambah kritik vision (berbiaya, hanya admin).
 *         body.pauseAdId / body.duplicateAdsetId / body.activateCopyId / body.createAdVariant / body.activateAdId.
 * Pause otomatis HANYA oleh cron, bila kebijakan pause_weak_ad = auto, mode otonom aktif, dan kill switch mati.
 */

type ActionRow = {
  adId: string;
  adName: string;
  type: "pause_weak_ad" | "duplicate_winner" | "create_ad";
  adsetId?: string;
  copiedAdsetId?: string;
  createdAdId?: string;
  headline?: string;
  primaryText?: string;
  status: "executed" | "recommended" | "blocked" | "failed";
  note: string;
};

async function latestReport() {
  const { data } = await getServiceClient().from("engine_creative_reports").select("*").order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

async function approvePause(adId: string, email?: string) {
  const report = await latestReport();
  const rec = (report?.actions as ActionRow[] | undefined)?.find((a) => a.adId === adId && a.status === "recommended");
  if (!rec) return NextResponse.json({ ok: false, error: "Iklan ini tidak ada di rekomendasi pause laporan terakhir." }, { status: 400 });
  const creds = await resolveServerMetaCreds();
  if (!creds) return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });
  const r = await setObjectStatus(adId, "PAUSED", creds.token, creds.appSecret);
  await logEngineAction({
    source: "manual", actor: email || "admin", actionType: "pause_weak_ad", planId: `pause_ad:${adId}`,
    idempotencyKey: `pause_ad:${adId}:${wibDate()}`, campaignId: adId, campaignName: rec.adName, ok: r.ok, liveExecuted: r.ok,
    summary: r.ok ? `Iklan "${rec.adName}" dipause atas persetujuan admin. ${rec.note}` : `Gagal pause iklan: ${r.error}`,
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, summary: `Iklan "${rec.adName}" dipause.` });
}

async function runDuplicate(adsetId: string, adName: string, evidence: string, via: "cron" | "admin", actor: string) {
  const creds = await resolveServerMetaCreds();
  if (!creds) return { ok: false as const, error: "Token Meta belum tersedia di server." };
  const g = await checkManualLiveChange({ kind: "create" });
  if (!g.allowed) return { ok: false as const, error: g.reason || "Ditolak guardrail." };
  const idem = `dup_adset:${adsetId}:${wibDate()}`;
  if (await hasSucceededToday(idem)) return { ok: false as const, error: "Ad set ini sudah diduplikasi hari ini." };
  const r = await duplicateAdsetPaused(adsetId, creds);
  await logEngineAction({
    source: via === "cron" ? "cron" : "manual", actor, actionType: "duplicate_winner", planId: `dup:${adsetId}`, idempotencyKey: idem,
    campaignId: adsetId, campaignName: adName, ok: r.ok, liveExecuted: r.ok,
    summary: r.ok ? `Ad set pemenang "${adName}" diduplikasi sebagai salinan PAUSED (${r.copiedAdsetId}). ${evidence}` : `Gagal menduplikasi: ${r.error}`,
    response: r.ok ? { copiedAdsetId: r.copiedAdsetId } : { error: r.error },
  });
  return r.ok ? { ok: true as const, copiedAdsetId: r.copiedAdsetId } : { ok: false as const, error: r.error };
}

async function approveDuplicate(adsetId: string, email?: string) {
  const report = await latestReport();
  const rec = (report?.actions as ActionRow[] | undefined)?.find((a) => a.type === "duplicate_winner" && a.adsetId === adsetId && a.status === "recommended");
  if (!rec) return NextResponse.json({ ok: false, error: "Ad set ini tidak ada di rekomendasi duplikasi laporan terakhir." }, { status: 400 });
  const r = await runDuplicate(adsetId, rec.adName, rec.note, "admin", email || "admin");
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, summary: `Salinan dibuat dalam keadaan PAUSED (${r.copiedAdsetId}). Aktifkan saat Anda siap.` });
}

/** Mengaktifkan salinan menambah belanja: tunduk pada kill switch, plafon, dan hanya untuk salinan buatan engine. */
async function activateCopy(copiedAdsetId: string, email?: string) {
  const log = await findDuplicateLog(copiedAdsetId);
  if (!log) return NextResponse.json({ ok: false, error: "Salinan ini tidak tercatat dibuat oleh engine dalam 14 hari terakhir." }, { status: 400 });
  const creds = await resolveServerMetaCreds();
  if (!creds) return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });
  const g = await checkManualLiveChange({ kind: "activate" });
  if (!g.allowed) return NextResponse.json({ ok: false, blockedByGuardrail: true, error: g.reason }, { status: 403 });
  const budget = await readAdsetDailyBudget(copiedAdsetId, creds);
  if (budget !== null) {
    const gb = await checkManualLiveChange({ kind: "budget", requestedBudget: budget });
    if (!gb.allowed) return NextResponse.json({ ok: false, blockedByGuardrail: true, error: gb.reason }, { status: 403 });
  }
  const r = await setObjectStatus(copiedAdsetId, "ACTIVE", creds.token, creds.appSecret);
  await logEngineAction({
    source: "manual", actor: email || "admin", actionType: "activate_duplicate", planId: `activate:${copiedAdsetId}`,
    idempotencyKey: `activate_dup:${copiedAdsetId}:${wibDate()}`, campaignId: copiedAdsetId, campaignName: log.name, ok: r.ok, liveExecuted: r.ok,
    afterValue: budget, summary: r.ok ? `Salinan "${log.name}" diaktifkan atas persetujuan admin (budget harian ${budget ?? "tidak terbaca"}).` : `Gagal mengaktifkan: ${r.error}`,
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, summary: `Salinan diaktifkan${budget ? ` dengan budget harian Rp ${budget.toLocaleString("id-ID")}` : ""}. Total belanja harian bertambah sebesar itu.` });
}

async function runCreateAdVariant(input: {
  adsetId: string;
  headline: string;
  primaryText: string;
  evidence: string;
  via: "cron" | "admin";
  actor: string;
}) {
  const creds = await resolveServerMetaCreds();
  if (!creds) return { ok: false as const, error: "Token Meta belum tersedia di server." };
  const g = await checkManualLiveChange({ kind: "create" });
  if (!g.allowed) return { ok: false as const, error: g.reason || "Ditolak guardrail." };
  if ((await countCreatedAdsToday()) >= 2) {
    return { ok: false as const, error: "Batas harian pembuatan iklan baru (maks 2/hari) tercapai." };
  }
  const idem = `create_ad:${input.adsetId}:${wibDate()}`;
  if (await hasSucceededToday(idem)) return { ok: false as const, error: "Varian iklan untuk ad set ini sudah dibuat hari ini." };

  const settings = await getServiceClient().from("winning_engine_config").select("ad_account_id").eq("id", "default").maybeSingle();
  const actId = String(settings?.data?.ad_account_id || process.env.META_AD_ACCOUNT_ID || "").trim();
  if (!actId) return { ok: false as const, error: "Ad Account ID belum tersedia." };

  const tmpl = await findTemplateCreative({ actId, adsetId: input.adsetId, creds });
  if (!tmpl.ok) return { ok: false as const, error: tmpl.error };

  const adName = `[EXPERT] ${input.headline.slice(0, 42)}`;
  const r = await createPausedAdVariant({
    actId,
    adsetId: input.adsetId,
    name: adName,
    headline: input.headline,
    primaryText: input.primaryText,
    template: tmpl.template,
    creds,
  });
  await logEngineAction({
    source: input.via === "cron" ? "cron" : "manual",
    actor: input.actor,
    actionType: "create_ad",
    planId: `create_ad:${input.adsetId}`,
    idempotencyKey: idem,
    campaignId: input.adsetId,
    campaignName: adName,
    ok: r.ok,
    liveExecuted: r.ok,
    summary: r.ok
      ? `Varian iklan PAUSED "${input.headline}" dibuat di Ad Set ${input.adsetId} (${r.adId}). ${input.evidence}`
      : `Gagal membuat varian iklan: ${r.error}`,
    response: r.ok ? { createdAdId: r.adId, creativeId: r.creativeId } : { error: r.error },
  });
  return r.ok ? { ok: true as const, createdAdId: r.adId } : { ok: false as const, error: r.error };
}

async function approveCreateAdVariant(payload: { adsetId?: string; headline?: string; primaryText?: string }, email?: string) {
  const report = await latestReport();
  const rec = (report?.actions as ActionRow[] | undefined)?.find(
    (a) => a.type === "create_ad" && a.status === "recommended" && (!payload.adsetId || a.adsetId === payload.adsetId)
  );
  const adsetId = payload.adsetId || rec?.adsetId || "";
  const headline = payload.headline || rec?.headline || "";
  const primaryText = payload.primaryText || rec?.primaryText || "";
  if (!adsetId || !headline || !primaryText) {
    return NextResponse.json({ ok: false, error: "Data ad set, headline, atau teks utama varian iklan tidak ditemukan." }, { status: 400 });
  }
  const r = await runCreateAdVariant({
    adsetId,
    headline,
    primaryText,
    evidence: rec?.note || "Disetujui admin dari analisa copy.",
    via: "admin",
    actor: email || "admin",
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, createdAdId: r.createdAdId, summary: `Varian iklan baru dibuat dalam status PAUSED (${r.createdAdId}). Aktifkan saat Anda siap.` });
}

async function activateCreatedAd(createdAdId: string, email?: string) {
  const log = await findCreatedAdLog(createdAdId);
  if (!log) return NextResponse.json({ ok: false, error: "Iklan ini tidak tercatat dibuat oleh engine dalam 14 hari terakhir." }, { status: 400 });
  const creds = await resolveServerMetaCreds();
  if (!creds) return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });
  const g = await checkManualLiveChange({ kind: "activate" });
  if (!g.allowed) return NextResponse.json({ ok: false, blockedByGuardrail: true, error: g.reason }, { status: 403 });
  const r = await setObjectStatus(createdAdId, "ACTIVE", creds.token, creds.appSecret);
  await logEngineAction({
    source: "manual", actor: email || "admin", actionType: "activate_created_ad", planId: `activate_ad:${createdAdId}`,
    idempotencyKey: `activate_ad:${createdAdId}:${wibDate()}`, campaignId: createdAdId, campaignName: log.name, ok: r.ok, liveExecuted: r.ok,
    summary: r.ok ? `Iklan baru "${log.name}" (${createdAdId}) diaktifkan atas persetujuan admin.` : `Gagal mengaktifkan iklan: ${r.error}`,
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, summary: `Iklan baru "${log.name}" diaktifkan.` });
}

async function runAnalysis(opts: { via: "cron" | "admin"; critique: boolean }) {
  if (!(await acquireRunLock("creatives", 8 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: "Analisa kreatif sedang berjalan." }, { status: 423 });
  }
  try {
    const creds = await resolveServerMetaCreds();
    if (!creds) return NextResponse.json({ ok: false, error: "Token Meta belum tersedia di server." }, { status: 400 });

    const settings = await loadDbEngineSettings();
    const config = { ...DEFAULT_WINNING_ENGINE_CONFIG, ...settings.overrides } as WinningEngineConfig;
    const data = await fetchAdsDataset(creds, 7);
    if (!data.ok) return NextResponse.json({ ok: false, error: data.error || "Gagal membaca iklan." }, { status: 502 });
    // Hanya iklan dari kampanye yang dicentang admin
    const trackedAds = filterTracked(data.ads, settings.trackedCampaignIds, (a) => a.campaignId);
    data.ads = trackedAds.kept;
    if (trackedAds.dropped > 0) data.warnings.push(`${trackedAds.dropped} iklan dari kampanye yang tidak dicentang diabaikan.`);

    const lossLineCpa = config.breakEvenCpa > 0
      ? Math.min(config.breakEvenCpa, config.targetCpa * config.killMaxMultipleOfTarget)
      : config.targetCpa * config.killMaxMultipleOfTarget;
    const analysis = analyzeAds(data.ads, {
      thresholds: {
        targetCpa: config.targetCpa, lossLineCpa, winProbability: config.winProbabilityToScale, lossProbability: config.lossProbabilityToPause,
        minPurchasesToScale: config.minPurchasesToScale, minLinkClicksToJudge: config.minLinkClicksToJudge, learningHardStopSpend: config.learningHardStopSpend,
      },
      priorStrengthClicks: config.priorStrengthClicks,
      learningAdsets: data.learningAdsets,
    });
    // Learning ad set tidak terbaca = jangan pause otomatis (fail closed)
    const learningUnknown = data.warnings.some((w) => w.includes("learning"));

    const holds = await loadUserHolds(72);
    const canAuto = opts.via === "cron" && config.autonomous && !config.killSwitch && settings.policy.pause_weak_ad === "auto" && !learningUnknown;
    const actions: ActionRow[] = [];
    let paused = 0;

    for (const c of analysis.pauseCandidates) {
      const evidence = `Spend Rp ${Math.round(c.spend).toLocaleString("id-ID")}, ${c.purchases} pembelian, peluang rugi ${Math.round((c.verdict.pLoss ?? 0) * 100)}%. ${c.verdict.reason}`;
      if (holds[c.id]) { actions.push({ adId: c.id, adName: c.name, type: "pause_weak_ad", status: "blocked", note: holds[c.id] }); continue; }
      if (!canAuto) {
        const why = settings.policy.pause_weak_ad === "recommend" ? "Kebijakan: rekomendasi saja." : opts.via !== "cron" ? "Analisa manual tidak mengeksekusi." : config.killSwitch ? "Kill switch aktif." : !config.autonomous ? "Mode otonom mati." : learningUnknown ? "Status learning tidak terbaca." : "Menunggu persetujuan Anda.";
        actions.push({ adId: c.id, adName: c.name, type: "pause_weak_ad", status: "recommended", note: `${why} ${evidence}` });
        continue;
      }
      const idem = `pause_ad:${c.id}:${wibDate()}`;
      if (await hasSucceededToday(idem)) continue;
      const r = await setObjectStatus(c.id, "PAUSED", creds.token, creds.appSecret);
      await logEngineAction({
        source: "cron", actor: "expert", actionType: "pause_weak_ad", planId: `pause_ad:${c.id}`, idempotencyKey: idem,
        campaignId: c.id, campaignName: c.name, ok: r.ok, liveExecuted: r.ok,
        summary: r.ok ? `Iklan "${c.name}" dipause otomatis. ${evidence}` : `Gagal pause iklan "${c.name}": ${r.error}`,
        response: { objectType: "ad", parentCampaignId: c.campaignId },
      });
      if (r.ok) paused += 1;
      actions.push({ adId: c.id, adName: c.name, type: "pause_weak_ad", status: r.ok ? "executed" : "failed", note: r.ok ? evidence : r.error });
    }

    // Duplikasi pemenang: salinan selalu PAUSED. Maks 1 per run.
    {
      const recent = await loadRecentlyDuplicated(7);
      const cand = pickDuplicateCandidate(analysis, { minPurchases: config.minPurchasesToScale, recentlyDuplicatedAdsets: recent });
      const dupPolicy = settings.policy.duplicate_winner;
      if (cand) {
        const evidence = `CPA Rp ${Math.round(cand!.cpa ?? 0).toLocaleString("id-ID")} dari ${cand!.purchases} pembelian, peluang di bawah target ${Math.round((cand!.verdict.pWin ?? 0) * 100)}%.`;
        const row: ActionRow = { adId: cand!.id, adName: cand!.name, type: "duplicate_winner", adsetId: cand!.adsetId, status: "recommended", note: evidence };
        const autoOk = canAuto && dupPolicy === "auto";
        if (autoOk) {
          const r = await runDuplicate(cand!.adsetId, cand!.name, evidence, "cron", "expert");
          row.status = r.ok ? "executed" : "failed";
          row.note = r.ok ? `Salinan PAUSED dibuat. ${evidence}` : r.error;
          if (r.ok) row.copiedAdsetId = r.copiedAdsetId;
        } else {
          row.note = `${dupPolicy === "recommend" ? "Kebijakan: rekomendasi saja." : "Menunggu persetujuan Anda."} ${evidence}`;
        }
        actions.push(row);
      }
    }

    // Fase 3: Analisa Copywriting & Sudut Pandang + Brief Kreatif
    const copyAnalysis = analyzeAdCopyVariants(data.ads, {
      targetCpa: config.targetCpa,
      existingVariants: data.ads.map((a) => a.title),
    });

    // Rencana pembuatan iklan baru (PAUSED, memakai aset akun + copy angle menang). Maks 1 per run.
    if (copyAnalysis.variants.length > 0) {
      const targetAd =
        [...analysis.winners].sort((x, y) => y.spend - x.spend)[0] ||
        [...analysis.ads].filter((a) => a.effectiveStatus === "ACTIVE" && !a.inLearning).sort((x, y) => y.spend - x.spend)[0];
      if (targetAd && targetAd.adsetId) {
        const v = copyAnalysis.variants[0];
        const createPolicy = settings.policy.create_ad;
        const autoCreateOk = canAuto && createPolicy === "auto" && (await countCreatedAdsToday()) < 1 && analysis.winners.length > 0;
        const row: ActionRow = {
          adId: `variant:${targetAd.adsetId}:${copyAnalysis.winningAngle}`,
          adName: `Varian Iklan: ${v.headline}`,
          type: "create_ad",
          adsetId: targetAd.adsetId,
          headline: v.headline,
          primaryText: v.primaryText,
          status: "recommended",
          note: v.rationale,
        };
        if (autoCreateOk) {
          const r = await runCreateAdVariant({
            adsetId: targetAd.adsetId,
            headline: v.headline,
            primaryText: v.primaryText,
            evidence: v.rationale,
            via: "cron",
            actor: "expert",
          });
          row.status = r.ok ? "executed" : "failed";
          row.note = r.ok ? `Iklan baru PAUSED dibuat. ${v.rationale}` : r.error;
          if (r.ok) row.createdAdId = r.createdAdId;
        } else {
          row.note = `${createPolicy === "recommend" ? "Kebijakan: rekomendasi saja." : "Menunggu persetujuan Anda."} ${v.rationale}`;
        }
        actions.push(row);
      }
    }

    // Simpan pembelajaran angle & fatigue ke winning_engine_learnings (Fase 4)
    const bestAngle = copyAnalysis.angles.find((a) => a.angle === copyAnalysis.winningAngle);
    if (bestAngle && bestAngle.impressions >= 500) {
      await recordEngineLearning({
        pillar: "ads_testing",
        category: "winning_angle",
        finding: `Angle copy "${bestAngle.label}" tampil paling kuat pada ${bestAngle.adCount} iklan (${bestAngle.purchases} beli, CTR ${bestAngle.weightedCtrPct.toFixed(2)}%).`,
        evidenceMetric: bestAngle.cpa ? `CPA Rp ${bestAngle.cpa.toLocaleString("id-ID")} | CTR ${bestAngle.weightedCtrPct.toFixed(2)}%` : `CTR ${bestAngle.weightedCtrPct.toFixed(2)}% | ${bestAngle.impressions} impresi`,
        confidence: bestAngle.purchases >= 2 ? 85 : 70,
      }).catch(() => false);
    }
    if (analysis.fatigued.length > 0) {
      const f = analysis.fatigued[0];
      await recordEngineLearning({
        pillar: "ads_testing",
        category: "creative_fatigue",
        finding: `Kreatif "${f.name}" mengalami fatigue di frekuensi ${f.frequency.toFixed(1)}. Perlu rotasi hook/headline.`,
        evidenceMetric: f.notes.join(" "),
        confidence: 80,
      }).catch(() => false);
    }

    // Kritik vision: hanya admin, dibatasi 4 iklan agar biaya terkendali
    const critiques: CreativeCritique[] = [];
    if (opts.critique && opts.via === "admin") {
      const picks: AdAnalysis[] = [];
      const add = (a?: AdAnalysis) => { if (a && !picks.some((p) => p.id === a.id) && picks.length < 4) picks.push(a); };
      analysis.pauseCandidates.forEach(add);
      analysis.fatigued.forEach(add);
      analysis.ads.filter((a) => a.flags.length > 0).forEach(add);
      [...analysis.winners].sort((x, y) => y.spend - x.spend).slice(0, 1).forEach(add);
      // Tanpa penanda atau pemenang pun, tetap kritik iklan berbelanja terbesar
      [...analysis.ads].filter((a) => a.impressions > 0).sort((x, y) => y.spend - x.spend).forEach(add);
      const key = settings.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
      for (const p of picks) {
        const rec = data.ads.find((a) => a.id === p.id);
        if (rec) critiques.push(await critiqueAd({ ad: rec, analysis: p, apiKey: key }));
      }
    }

    const summary = {
      adsTotal: data.ads.length,
      adsActive: data.ads.filter((a) => a.effectiveStatus === "ACTIVE").length,
      winners: analysis.winners.length,
      fatigued: analysis.fatigued.length,
      pauseCandidates: analysis.pauseCandidates.length,
      paused,
      benchmarks: analysis.benchmarks,
    };
    const briefs = copyAnalysis.brief ? [copyAnalysis.brief] : [];
    await getServiceClient().from("engine_creative_reports").insert({
      trigger: opts.via === "cron" ? "cron" : "manual",
      summary,
      ads: analysis.ads,
      actions,
      critiques,
      warnings: data.warnings,
      copy_analysis: copyAnalysis,
      creative_briefs: briefs,
    });

    if (paused > 0) {
      await sendAdminPush({ title: "Expert menjeda iklan lemah", body: `${paused} iklan dipause otomatis. Buka untuk melihat atau membatalkan.`, tag: "expert-ad-paused" }).catch(() => null);
    }
    const critiqueNote = opts.critique && opts.via === "admin" && critiques.length === 0 ? "Tidak ada iklan dengan tayangan untuk dikritik pada kampanye yang dipilih." : undefined;
    return NextResponse.json({ ok: true, summary, actions, critiques, copyAnalysis, briefs, warnings: data.warnings, critiqueNote });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Analisa kreatif gagal." }, { status: 500 });
  } finally {
    await releaseRunLock("creatives");
  }
}

export async function GET(req: NextRequest) {
  if (isCronRequest(req)) return runAnalysis({ via: "cron", critique: false });
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  return NextResponse.json({ ok: true, report: await latestReport() });
}

export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req, { allowCron: true });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  if (auth.via === "admin" && typeof body.pauseAdId === "string" && body.pauseAdId) return approvePause(body.pauseAdId, auth.email);
  if (auth.via === "admin" && typeof body.duplicateAdsetId === "string" && body.duplicateAdsetId) return approveDuplicate(body.duplicateAdsetId, auth.email);
  if (auth.via === "admin" && typeof body.activateCopyId === "string" && body.activateCopyId) return activateCopy(body.activateCopyId, auth.email);
  if (auth.via === "admin" && body.createAdVariant && typeof body.createAdVariant === "object") return approveCreateAdVariant(body.createAdVariant, auth.email);
  if (auth.via === "admin" && typeof body.activateAdId === "string" && body.activateAdId) return activateCreatedAd(body.activateAdId, auth.email);
  return runAnalysis({ via: auth.via, critique: Boolean(body.critique) });
}

