/**
 * Uji regresi inti keputusan. Jalankan: npx tsx engine/__tests__/winningEngine.scenarios.ts
 * Keluar dengan kode 1 jika ada yang gagal.
 */
import assert from "node:assert/strict";
import { betaCdf, betaQuantile, lgamma, classifyCampaign, buildPrior, scaleStepPct } from "../decisionCore";
import { runFivePillarDiagnostics, evaluateGuardrailGate, DEFAULT_WINNING_ENGINE_CONFIG as CFG } from "../winningEngine";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log("OK  ", name); }
  catch (e: any) { failures.push(name); console.log("FAIL", name, "\n     ", e.message.split("\n")[0]); }
}
const near = (a: number, b: number, tol = 1e-5) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

// ---- Matematika terhadap nilai analitik ----
test("lgamma(5) = ln 24", () => near(lgamma(5), Math.log(24), 1e-9));
test("Beta(2,5) CDF(0.2) = 0.34464", () => near(betaCdf(0.2, 2, 5), 0.34464));
test("Beta(5,2) CDF(0.8) = 0.65536", () => near(betaCdf(0.8, 5, 2), 0.65536));
test("kuantil Beta konsisten dengan CDF", () => near(betaCdf(betaQuantile(0.37, 3, 40), 3, 40), 0.37, 1e-9));

// ---- Skenario kampanye ----
const base: any = { status: "ACTIVE", impressions: 20000, ctr: 1, cpc: 0, leads: 0, frequency: 1.5, roas: 0, cpa: 0,
  thumbstopRate: 0, healthStatus: "ok", targetAudience: "", creativeHook: "", lastUpdated: "", objective: "OUTCOME_SALES", inLearning: false };
const old = new Date(Date.now() - 30 * 86400000).toISOString();
const mk = (id: string, o: any): any => ({ ...base, id, name: id, createdTime: old, effectiveStatus: "ACTIVE", ...o });
const campaigns = [
  mk("winner",   { spend: 300000, linkClicks: 400, clicks: 420, purchases: 10, cpa: 30000, dailyBudget: 200000, landingPageViews: 330, checkoutsInitiated: 30, purchasesConversionValue: 1990000 }),
  mk("coinflip", { spend: 135000, linkClicks: 120, clicks: 130, purchases: 3,  cpa: 45000, dailyBudget: 150000, landingPageViews: 100, checkoutsInitiated: 8,  purchasesConversionValue: 597000 }),
  mk("profit",   { spend: 450000, linkClicks: 350, clicks: 370, purchases: 6,  cpa: 75000, dailyBudget: 150000, landingPageViews: 300, checkoutsInitiated: 20, purchasesConversionValue: 1194000 }),
  mk("bleeder",  { spend: 450000, linkClicks: 300, clicks: 320, purchases: 0,  cpa: 0,     dailyBudget: 150000, landingPageViews: 250, checkoutsInitiated: 2 }),
  mk("tiny",     { spend: 90000,  linkClicks: 40,  clicks: 45,  purchases: 0,  cpa: 0,     dailyBudget: 100000, landingPageViews: 35 }),
  mk("learning", { spend: 100000, linkClicks: 70,  clicks: 80,  purchases: 0,  cpa: 0,     dailyBudget: 100000, landingPageViews: 60, inLearning: true, createdTime: new Date(Date.now() - 2 * 86400000).toISOString() }),
];
const mockCapi: any = { connected: true, pixelId: "1", eventMatchQuality: 8.6, serverEvents24h: 342, browserEvents24h: 310, redundancyRate: 98.4, verified: false };
const r = runFivePillarDiagnostics({ campaigns, config: CFG, capiStatus: mockCapi });
const kind = (id: string) => r.verdicts.find((v) => v.campaignId === id)!.verdict.kind;
const planFor = (type: string, id: string) => r.plans.find((p) => p.actionType === type && p.actionPayload?.campaignId === id);

test("winner terbukti -> winner", () => assert.equal(kind("winner"), "winner"));
test("3 pembelian tepat di target BUKAN winner (aturan lama men-scale ini)", () => { assert.notEqual(kind("coinflip"), "winner"); assert.ok(!planFor("scale_campaign_budget", "coinflip")); });
test("CPA 75k masih untung -> tidak di-pause (aturan lama mem-pause ini)", () => { assert.equal(kind("profit"), "profitable"); assert.ok(!planFor("pause_bleeding_campaign", "profit")); });
test("300 klik nol pembelian -> merugi + rencana pause", () => { assert.equal(kind("bleeder"), "losing"); assert.ok(planFor("pause_bleeding_campaign", "bleeder")); });
test("sampel 40 klik -> ditahan, bukan di-pause", () => { assert.equal(kind("tiny"), "insufficient"); assert.ok(!planFor("pause_bleeding_campaign", "tiny")); });
test("learning dibiarkan", () => { assert.equal(kind("learning"), "learning"); assert.ok(!planFor("pause_bleeding_campaign", "learning")); });
test("setiap kampanye yang ditahan tercatat alasannya", () => {
  for (const id of ["coinflip", "profit", "tiny", "learning"]) assert.ok(r.dataAudit.some((a) => a.campaignId === id && a.decision === "held"), id);
});
test("portofolio menghitung budget di kampanye merugi", () => { assert.equal(r.portfolio.losingDailyBudget, 150000); assert.ok(r.portfolio.losingBudgetSharePct > 0); });
test("tidak ada rencana kampanye uji saat sudah ada winner", () => assert.ok(!r.plans.some((p) => p.actionType === "create_rapid_test_campaign")));

// ---- Scale ----
const scalePlan = planFor("scale_campaign_budget", "winner")!;
test("scale winner: langkah <= maksimum config, membawa bukti probabilitas", () => {
  assert.ok(scalePlan);
  assert.ok(scalePlan.actionPayload.scalePct <= CFG.maxScalePctPerStep);
  assert.ok(scalePlan.actionPayload.winProbability >= CFG.winProbabilityToScale);
});
test("scale tidak melompat ke minDailyBudget (budget 50rb naik sebesar langkah, bukan jadi 100rb)", () => {
  const rr = runFivePillarDiagnostics({ campaigns: [mk("small", { spend: 300000, linkClicks: 400, clicks: 420, purchases: 10, cpa: 30000, dailyBudget: 50000, landingPageViews: 330, purchasesConversionValue: 1990000 })], config: CFG });
  const p = rr.plans.find((x) => x.actionType === "scale_campaign_budget")!;
  assert.ok(p.actionPayload.newBudget <= 50000 * 1.2 + 1, `newBudget=${p.actionPayload.newBudget}`);
});

// ---- Garis rugi berbatas ----
test("garis rugi dibatasi kelipatan target walau break-even di atas kertas jauh lebih besar", () => {
  // AOV ~199k -> break-even ~179k, tetapi garis rugi maksimum 2,5 x 45k = 112,5k.
  // 40 pembelian di CPA 140k (4000 klik): peluang CPA > 112,5k = 93%, padahal masih di bawah break-even 179k.
  const rr = runFivePillarDiagnostics({ campaigns: [
    mk("pricey", { spend: 5600000, linkClicks: 4000, clicks: 4200, purchases: 40, dailyBudget: 300000, landingPageViews: 3500, purchasesConversionValue: 7960000 }),
  ], config: CFG });
  assert.ok(rr.breakEven.cpa > 150000);
  assert.equal(rr.verdicts[0].verdict.kind, "losing");
});
test("bukti belum cukup: 6 pembelian di CPA 150k (600 klik) ditahan, bukan di-pause", () => {
  const rr = runFivePillarDiagnostics({ campaigns: [
    mk("few", { spend: 900000, linkClicks: 600, clicks: 640, purchases: 6, dailyBudget: 150000, landingPageViews: 500, purchasesConversionValue: 1194000 }),
  ], config: CFG });
  assert.notEqual(rr.verdicts[0].verdict.kind, "losing");
  assert.ok(!rr.plans.some((p) => p.actionType === "pause_bleeding_campaign"));
});
test("peringatan jika target CPA melebihi break-even", () => {
  const rr = runFivePillarDiagnostics({ campaigns: [], config: { ...CFG, targetCpa: 120000 } });
  assert.ok(rr.configWarnings.length > 0);
});

// ---- Guardrail server ----
const pausePlan = planFor("pause_bleeding_campaign", "bleeder")!;
test("gate: scale winner lolos dan di-clamp ke langkah dinamis", () => {
  const g = evaluateGuardrailGate(scalePlan, CFG);
  assert.ok(g.allowed); assert.ok(g.clampedBudget! <= Math.round(200000 * (1 + scalePlan.actionPayload.scalePct / 100)));
});
test("gate: scale otomatis tanpa/di bawah ambang probabilitas ditolak", () => {
  assert.ok(!evaluateGuardrailGate({ ...scalePlan, actionPayload: { ...scalePlan.actionPayload, winProbability: 0.5 } }, CFG).allowed);
  assert.ok(!evaluateGuardrailGate({ ...scalePlan, actionPayload: { ...scalePlan.actionPayload, winProbability: undefined } }, CFG).allowed);
});
test("gate: payload tidak bisa memaksa langkah lebih besar dari yang dihitung engine", () => {
  const g = evaluateGuardrailGate({ ...scalePlan, actionPayload: { ...scalePlan.actionPayload, newBudget: 400000 } }, CFG);
  assert.ok(g.clampedBudget! <= Math.round(200000 * (1 + CFG.maxScalePctPerStep / 100)));
});
test("gate: pause otomatis butuh bukti rugi; tanpa bukti ditolak", () => {
  assert.ok(evaluateGuardrailGate(pausePlan, CFG).allowed);
  assert.ok(!evaluateGuardrailGate({ ...pausePlan, actionPayload: { ...pausePlan.actionPayload, lossProbability: 0.6 } }, CFG).allowed);
  assert.ok(!evaluateGuardrailGate({ ...pausePlan, actionPayload: { ...pausePlan.actionPayload, lossProbability: undefined } }, CFG).allowed);
});
test("gate: pause yang disetujui manual tidak diblok oleh bukti probabilitas", () => {
  assert.ok(evaluateGuardrailGate({ ...pausePlan, status: "approved", actionPayload: { ...pausePlan.actionPayload, lossProbability: 0.3 } }, CFG).allowed);
});
// Celah yang ditemukan: mode otonom dulu memaksa status "approved", sehingga pemeriksaan bukti/learning/cooldown terlewati.
const asEngine = (pl: any, payload: any = {}) => ({ ...pl, status: "approved", approvedBy: "engine", actionPayload: { ...pl.actionPayload, ...payload } });
test("gate: persetujuan MESIN tetap diperiksa bukti probabilitasnya (pause)", () => {
  assert.ok(evaluateGuardrailGate(asEngine(pausePlan), CFG).allowed);
  assert.ok(!evaluateGuardrailGate(asEngine(pausePlan, { lossProbability: 0.5 }), CFG).allowed);
});
test("gate: persetujuan MESIN tetap diperiksa bukti probabilitasnya (scale)", () => {
  assert.ok(!evaluateGuardrailGate(asEngine(scalePlan, { winProbability: 0.4 }), CFG).allowed);
});
test("gate: persetujuan MESIN tetap menghormati cooldown dan learning", () => {
  const recent = new Date(Date.now() - 3 * 3600000).toISOString();
  assert.ok(!evaluateGuardrailGate(asEngine(scalePlan, { lastBudgetChangedAt: recent }), CFG).allowed);
  assert.ok(!evaluateGuardrailGate(asEngine(scalePlan, { inLearning: true }), CFG).allowed);
});
test("gate: persetujuan MANUSIA tetap boleh melewati (admin memutuskan sendiri)", () => {
  const recent = new Date(Date.now() - 3 * 3600000).toISOString();
  assert.ok(evaluateGuardrailGate({ ...scalePlan, status: "approved", actionPayload: { ...scalePlan.actionPayload, lastBudgetChangedAt: recent } }, CFG).allowed);
});
test("gate: kill switch menghentikan semuanya", () => assert.ok(!evaluateGuardrailGate(scalePlan, { ...CFG, killSwitch: true }).allowed));

// ---- Tidak ada angka karangan ----
test("CAPI mock (verified:false) tidak dinilai -> perlu_data, tanpa rencana", () => {
  const t = r.pillars.find((p) => p.id === "tracking")!;
  assert.equal(t.status, "perlu_data"); assert.ok(!r.plans.some((p) => p.actionType === "repair_tracking_capi"));
});
test("CAPI terverifikasi dengan EMQ rendah -> rencana perbaikan", () => {
  const rr = runFivePillarDiagnostics({ campaigns: [], config: CFG, capiStatus: { ...mockCapi, verified: true, eventMatchQuality: 6.2 } });
  assert.ok(rr.plans.some((p) => p.actionType === "repair_tracking_capi"));
});
test("tanpa data: semua pilar perlu_data, skor 0, tidak ada rencana LP/checkout/offer", () => {
  const e = runFivePillarDiagnostics({ campaigns: [], config: CFG });
  assert.ok(e.pillars.every((p) => p.status === "perlu_data")); assert.equal(e.overallScore, 0);
  assert.deepEqual(e.plans.map((p) => p.actionType), ["create_rapid_test_campaign"]);
});
test("skor keseluruhan mengabaikan pilar tanpa data", () => {
  const scored = r.pillars.filter((p) => p.status !== "perlu_data");
  assert.equal(r.overallScore, Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length));
});
test("tidak ada teks klaim dampak hardcoded (akurasi/persentase turun)", () => {
  const blob = JSON.stringify(r.plans.map((p) => p.expectedImpact + p.whyEvidence));
  assert.ok(!/akurasi 99|turun 1\d/i.test(blob));
});

console.log(`\n${passed} lulus, ${failures.length} gagal`);
if (failures.length) { console.log("Gagal:", failures.join("; ")); process.exit(1); }
