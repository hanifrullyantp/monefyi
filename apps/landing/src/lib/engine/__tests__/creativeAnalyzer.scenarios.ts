/** Jalankan: npx tsx src/lib/engine/__tests__/creativeAnalyzer.scenarios.ts */
import assert from "node:assert/strict";
import { analyzeAds, detectFatigue, pickDuplicateCandidate } from "../creativeAnalyzer";
import type { AdRecord } from "../adCreativeData";
import { DEFAULT_WINNING_ENGINE_CONFIG as C } from "../winningEngine";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log("OK  ", name); } catch (e: any) { failures.push(name); console.log("FAIL", name, "\n     ", e.message.split("\n")[0]); }
}

const T = {
  targetCpa: 45000, lossLineCpa: 112500, winProbability: 0.8, lossProbability: 0.9,
  minPurchasesToScale: 3, minLinkClicksToJudge: 100, learningHardStopSpend: 135000,
};
const OPT = { thresholds: T, priorStrengthClicks: C.priorStrengthClicks, learningAdsets: [] as string[] };

const ad = (o: Partial<AdRecord> = {}): AdRecord => ({
  id: "a", name: "ad", adsetId: "s1", campaignId: "c1", effectiveStatus: "ACTIVE", title: "", body: "", imageUrl: "",
  isVideo: true, callToAction: "", spend: 50000, impressions: 5000, linkClicks: 100, linkCtr: 2, frequency: 1.5,
  purchases: 2, revenue: 400000, video3s: 1500, thruplays: 500, daily: [], ...o,
});
const days = (ctrs: number[], imp = 1000, freq = 3) => ctrs.map((c, i) => ({ date: `2026-11-0${i + 1}`, impressions: imp, linkClicks: Math.round((imp * c) / 100), ctr: c, frequency: freq }));

test("fatigue: CTR turun 3 hari terakhir + frekuensi tinggi", () => assert.equal(detectFatigue(ad({ daily: days([3, 3, 3, 3, 1.5, 1.5, 1.5]) })).fatigued, true));
test("fatigue: frekuensi rendah = bukan fatigue", () => assert.equal(detectFatigue(ad({ daily: days([3, 3, 3, 3, 1.5, 1.5, 1.5], 1000, 1.2), frequency: 1.2 })).fatigued, false));
test("fatigue: data < 5 hari = tidak dinilai", () => assert.equal(detectFatigue(ad({ daily: days([3, 3, 1]) })).fatigued, false));
test("fatigue: impresi kecil = tidak dinilai", () => assert.equal(detectFatigue(ad({ daily: days([3, 3, 3, 3, 1, 1, 1], 100) })).fatigued, false));

test("hook rendah vs median ditandai", () => {
  const peers = [1, 2, 3, 4].map((i) => ad({ id: `p${i}` }));
  const bad = ad({ id: "bad", video3s: 300 });
  const r = analyzeAds([...peers, bad], OPT);
  assert.ok(r.ads.find((a) => a.id === "bad")!.flags.includes("LOW_HOOK"));
  assert.ok(!r.ads.find((a) => a.id === "p1")!.flags.includes("LOW_HOOK"));
});
test("tanpa cukup rekan = tanpa patokan, tanpa flag", () => {
  const r = analyzeAds([ad({ id: "x", video3s: 10 }), ad({ id: "y" })], OPT);
  assert.equal(r.benchmarks.medianHookRatePct, null);
  assert.equal(r.ads[0].flags.length, 0);
});
test("impresi di bawah minimum tidak dinilai", () => {
  const peers = [1, 2, 3, 4].map((i) => ad({ id: `p${i}` }));
  const r = analyzeAds([...peers, ad({ id: "tiny", impressions: 200, video3s: 1 })], OPT);
  assert.equal(r.ads.find((a) => a.id === "tiny")!.flags.length, 0);
});

const loser = (id: string, adsetId = "s1") => ad({ id, adsetId, spend: 400000, linkClicks: 400, purchases: 0, revenue: 0, impressions: 20000 });
test("iklan boncos terbukti = kandidat pause", () => {
  const r = analyzeAds([loser("l1"), ad({ id: "ok1" })], OPT);
  assert.deepEqual(r.pauseCandidates.map((a) => a.id), ["l1"]);
});
test("jangan pause satu-satunya iklan aktif di ad set", () => {
  const r = analyzeAds([loser("l1"), ad({ id: "other", adsetId: "s2" })], OPT);
  assert.equal(r.pauseCandidates.length, 0);
  assert.ok(r.ads.find((a) => a.id === "l1")!.notes.some((n) => n.includes("satu-satunya")));
});
test("dua boncos di ad set dengan 2 iklan: hanya satu dipause", () => {
  const r = analyzeAds([loser("l1"), loser("l2")], OPT);
  assert.equal(r.pauseCandidates.length, 1);
});
test("ad set learning tidak dipause", () => {
  const r = analyzeAds([loser("l1"), ad({ id: "ok1" })], { ...OPT, learningAdsets: ["s1"] });
  assert.equal(r.pauseCandidates.length, 0);
});
test("iklan sudah PAUSED tidak jadi kandidat", () => {
  const r = analyzeAds([{ ...loser("l1"), effectiveStatus: "PAUSED" }, ad({ id: "ok1" })], OPT);
  assert.equal(r.pauseCandidates.length, 0);
});
test("sampel kecil tanpa pembelian tidak dipause", () => {
  const r = analyzeAds([ad({ id: "n", spend: 30000, linkClicks: 30, purchases: 0, revenue: 0 }), ad({ id: "ok1" })], OPT);
  assert.equal(r.pauseCandidates.length, 0);
});
test("maxPauses dihormati", () => {
  const r = analyzeAds([loser("l1", "s1"), ad({ id: "k1", adsetId: "s1" }), loser("l2", "s2"), ad({ id: "k2", adsetId: "s2" }), loser("l3", "s3"), ad({ id: "k3", adsetId: "s3" })], { ...OPT, maxPauses: 2 });
  assert.equal(r.pauseCandidates.length, 2);
});

const winnerAd = (id: string, adsetId = "s1", o: Partial<AdRecord> = {}) => ad({ id, adsetId, spend: 200000, linkClicks: 600, purchases: 10, revenue: 2000000, impressions: 30000, ...o });
test("winner layak diduplikasi", () => {
  const r = analyzeAds([winnerAd("w1"), ad({ id: "p1", adsetId: "s2" })], OPT);
  assert.equal(pickDuplicateCandidate(r, { minPurchases: 3, recentlyDuplicatedAdsets: new Set() })?.id, "w1");
});
test("ad set yang baru disalin dilewati", () => {
  const r = analyzeAds([winnerAd("w1")], OPT);
  assert.equal(pickDuplicateCandidate(r, { minPurchases: 3, recentlyDuplicatedAdsets: new Set(["s1"]) }), null);
});
test("winner yang learning tidak diduplikasi", () => {
  const r = analyzeAds([winnerAd("w1")], { ...OPT, learningAdsets: ["s1"] });
  assert.equal(pickDuplicateCandidate(r, { minPurchases: 3, recentlyDuplicatedAdsets: new Set() }), null);
});
test("pembelian di bawah minimum tidak diduplikasi", () => {
  const r = analyzeAds([winnerAd("w1")], OPT);
  assert.equal(pickDuplicateCandidate(r, { minPurchases: 50, recentlyDuplicatedAdsets: new Set() }), null);
});
test("pilih CPA terendah", () => {
  const r = analyzeAds([winnerAd("w1", "s1", { purchases: 10 }), winnerAd("w2", "s2", { purchases: 20, revenue: 4000000 })], OPT);
  assert.equal(pickDuplicateCandidate(r, { minPurchases: 3, recentlyDuplicatedAdsets: new Set() })?.id, "w2");
});

console.log(`\n${passed} lulus, ${failures.length} gagal`);
if (failures.length) process.exit(1);

