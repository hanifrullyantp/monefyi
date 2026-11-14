/** Jalankan: npx tsx src/lib/engine/__tests__/phase3_4.scenarios.ts */
import assert from "node:assert/strict";
import { parseSupervisorCritiqueJson, critiqueSupervisorEffectiveness } from "../supervisorCritic";
import { classifyCopyAngle, analyzeAdCopyVariants } from "../copyAnalyzer";
import { extractMobileCtaAudit, evaluatePageExperience, evaluateMessageMatch } from "../pageAudit";
import { POLICY_LABEL, policyActionForPlan } from "../autonomyPolicy";
import type { AdRecord } from "../adCreativeData";
import type { SupervisorReport } from "../supervisor";

let passed = 0;
const failures: string[] = [];
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log("OK  ", name);
  } catch (e: any) {
    failures.push(name);
    console.log("FAIL", name, "\n     ", e.message.split("\n")[0]);
  }
}

const mkAd = (id: string, p: Partial<AdRecord> = {}): AdRecord => ({
  id,
  name: id,
  adsetId: "as1",
  campaignId: "c1",
  effectiveStatus: "ACTIVE",
  title: "",
  body: "",
  imageUrl: "",
  isVideo: false,
  callToAction: "LEARN_MORE",
  spend: 100_000,
  impressions: 5000,
  linkClicks: 100,
  linkCtr: 2.0,
  frequency: 1.5,
  purchases: 2,
  revenue: 398_000,
  video3s: 0,
  thruplays: 0,
  daily: [],
  ...p,
});

const sampleSupReport: SupervisorReport = {
  score: 75,
  grade: "perlu_perhatian",
  findings: [],
  engageKillSwitch: false,
  metrics: { live7d: 4, reviewed: 4, improved: 2, stable: 1, worsened: 1, hitRatePct: 75, undoRatePct: 0, live24h: 1, failed24h: 0, rollbacks24h: 1 },
  suggestions: [],
};

async function run() {
  await test("supervisorCritic: parse JSON valid dalam code block", () => {
    const p = parseSupervisorCritiqueJson('```json\n{"summary":"Efektif 75%.","thresholdProposals":[{"param":"minPurchasesToScale","current":"5","suggested":"7","reason":"Kurangi false positive"}]}\n```');
    assert.ok(p);
    assert.equal(p!.summary, "Efektif 75%.");
    assert.equal(p!.thresholdProposals.length, 1);
    assert.equal(p!.thresholdProposals[0].param, "minPurchasesToScale");
  });

  await test("supervisorCritic: tanpa API key mengembalikan error + costOfMistakesIdr", async () => {
    const res = await critiqueSupervisorEffectiveness({
      report: sampleSupReport,
      reviewedActions: [
        { logId: 1, campaignName: "Camp A", actionType: "scale_campaign_budget", verdict: "memburuk", rolledBack: true, afterSpend: 250_000, afterPurchases: 0 },
        { logId: 2, campaignName: "Camp B", actionType: "scale_campaign_budget", verdict: "membaik", rolledBack: false, afterSpend: 180_000, afterPurchases: 5 },
      ],
      apiKey: "",
    });
    assert.equal(res.error, "OpenRouter API key belum diisi.");
    assert.equal(res.costOfMistakesIdr, 250_000);
  });

  await test("supervisorCritic: panggilan OpenRouter sukses diparse", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: "Performa cukup baik.", thresholdProposals: [] }) } }] }), { status: 200 });
    const res = await critiqueSupervisorEffectiveness({
      report: sampleSupReport,
      reviewedActions: [],
      apiKey: "sk-or-test",
      fetchImpl: fakeFetch,
    });
    assert.equal(res.error, undefined);
    assert.equal(res.summary, "Performa cukup baik.");
  });

  await test("copyAnalyzer: klasifikasi angle tepat", () => {
    assert.equal(classifyCopyAngle("Kirim PDF Saat Survei", "Hitung 1 menit di HP sebelum pulang"), "kecepatan_survei");
    assert.equal(classifyCopyAngle("Stop Proyek Tekor", "Salah hitung rumus Excel bikin rugi"), "pain_tekor");
    assert.equal(classifyCopyAngle("Penawaran Berlogo Usaha", "Klien percaya dan margin terkunci rapi"), "bukti_profesional");
  });

  await test("copyAnalyzer: pilih angle menang dan buat varian copy + brief", () => {
    const ads = [
      mkAd("ad-survei", { title: "Kirim PDF Saat Survei", body: "Hitung 1 menit di HP saat survei lokasi", spend: 120_000, purchases: 4, linkCtr: 3.1 }),
      mkAd("ad-tekor", { title: "Stop Proyek Tekor", body: "Jangan nomboki proyek pakai Excel rumit", spend: 200_000, purchases: 1, linkCtr: 1.4 }),
    ];
    const rep = analyzeAdCopyVariants(ads);
    assert.equal(rep.winningAngle, "kecepatan_survei");
    assert.ok(rep.variants.length >= 3);
    assert.ok(rep.brief && rep.brief.hooks.length > 0);
  });

  await test("pageAudit: deteksi kecepatan lambat, CTA mobile, dan message match", () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Monefyi Estimator</title></head><body><h1>Hitung Penawaran Proyek</h1><p>Solusi cepat kontraktor modern.</p><a class="py-3 w-full" href="/checkout">Beli Sekarang</a></body></html>`;
    const mob = extractMobileCtaAudit(html);
    assert.equal(mob.hasViewportMeta, true);
    assert.equal(mob.hasLargeMobileCta, true);
    assert.equal(mob.heroHeadline, "Hitung Penawaran Proyek");

    const exp = evaluatePageExperience({ ok: true, url: "https://estimator.monefyi.com/", title: "Monefyi Estimator", prices: [], hasOrderCta: true, responseTimeMs: 2600, mobileAudit: mob });
    assert.ok(exp.some((x) => x.includes("lambat")));

    const mm = evaluateMessageMatch([mkAd("a1", { title: "Hitung RAB Kitchen Set", body: "Kirim PDF survei ke WhatsApp klien" })], { title: "Monefyi Estimator", ...mob });
    assert.ok(mm.matchScorePct < 60);
    assert.ok(mm.missingOnLp.includes("kitchen set"));
    assert.ok(mm.findings.length > 0);
  });

  await test("autonomyPolicy: Fase 3 aksi ditandai implemented dan dipetakan benar", () => {
    assert.equal(POLICY_LABEL.create_ad.implemented, true);
    assert.equal(POLICY_LABEL.create_campaign.implemented, true);
    assert.equal(POLICY_LABEL.change_lp_copy.implemented, true);
    assert.equal(policyActionForPlan("update_lp_copy"), "change_lp_copy");
    assert.equal(policyActionForPlan("create_ad_variant"), "create_ad");
  });

  console.log(`\n${passed} lulus, ${failures.length} gagal`);
  if (failures.length) process.exit(1);
}

run();

