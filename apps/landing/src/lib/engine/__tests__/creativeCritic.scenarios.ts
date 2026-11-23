/** Jalankan: npx tsx src/lib/engine/__tests__/creativeCritic.scenarios.ts */
import assert from "node:assert/strict";
import { parseCritiqueJson, critiqueAd } from "../creativeCritic";
import { analyzeAds } from "../creativeAnalyzer";
import type { AdRecord } from "../adCreativeData";

let passed = 0;
const failures: string[] = [];
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log("OK  ", name); } catch (e: any) { failures.push(name); console.log("FAIL", name, "\n     ", e.message.split("\n")[0]); }
}

const ad: AdRecord = {
  id: "a1", name: "Iklan A", adsetId: "s", campaignId: "c", effectiveStatus: "ACTIVE", title: "T", body: "B", imageUrl: "https://x/y.jpg",
  isVideo: false, callToAction: "", spend: 1, impressions: 10, linkClicks: 1, linkCtr: 1, frequency: 1, purchases: 0, revenue: 0, video3s: 0, thruplays: 0, daily: [],
};
const analysis = analyzeAds([ad], {
  thresholds: { targetCpa: 45000, lossLineCpa: 112500, winProbability: 0.8, lossProbability: 0.9, minPurchasesToScale: 3, minLinkClicksToJudge: 100, learningHardStopSpend: 135000 },
  priorStrengthClicks: 40, learningAdsets: [],
}).ads[0];

(async () => {
  await test("parse: JSON dalam blok kode", () => {
    const r = parseCritiqueJson('```json\n{"scores":{"hook":7,"clarity":15,"proof":-2,"mobile":6},"issues":["a"],"headlineVariants":["h1"]}\n```');
    assert.ok(r); assert.equal(r!.scores!.clarity, 10); assert.equal(r!.scores!.proof, 0); assert.deepEqual(r!.headlineVariants, ["h1"]);
  });
  await test("parse: sampah = null", () => assert.equal(parseCritiqueJson("maaf saya tidak bisa"), null));
  await test("parse: JSON rusak = null", () => assert.equal(parseCritiqueJson("{bukan json}"), null));
  await test("tanpa API key = error jelas, tanpa panggilan jaringan", async () => {
    let called = false;
    const r = await critiqueAd({ ad, analysis, apiKey: "", fetchImpl: (async () => { called = true; return new Response("{}"); }) as any });
    assert.ok(r.error); assert.equal(called, false);
  });
  await test("balasan sukses diparse dan gambar ikut dikirim", async () => {
    let body: any;
    const f = (async (_u: string, init: any) => { body = JSON.parse(init.body); return new Response(JSON.stringify({ choices: [{ message: { content: '{"scores":{"hook":5,"clarity":6,"proof":4,"mobile":7},"issues":["hook lemah"]}' } }] })); }) as any;
    const r = await critiqueAd({ ad, analysis, apiKey: "k", fetchImpl: f });
    assert.equal(r.error, undefined); assert.equal(r.scores!.hook, 5);
    assert.ok(body.messages[1].content.some((c: any) => c.type === "image_url"));
  });
  await test("HTTP error dipetakan ke pesan", async () => {
    const f = (async () => new Response(JSON.stringify({ error: { message: "kuota habis" } }), { status: 402 })) as any;
    assert.equal((await critiqueAd({ ad, analysis, apiKey: "k", fetchImpl: f })).error, "kuota habis");
  });
  console.log(`\n${passed} lulus, ${failures.length} gagal`);
  if (failures.length) process.exit(1);
})();

