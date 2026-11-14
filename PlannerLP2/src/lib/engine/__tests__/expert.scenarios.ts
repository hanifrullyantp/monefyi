/** Jalankan: npx tsx src/lib/engine/__tests__/expert.scenarios.ts */
import assert from "node:assert/strict";
import { computeExpertStatus } from "../expertStatus";
import { resolvePolicy, policyAllowsAuto, DEFAULT_AUTONOMY_POLICY } from "../autonomyPolicy";
import { evaluatePreflight } from "../preflight";
import { filterTracked } from "../trackedCampaigns";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log("OK  ", name); } catch (e: any) { failures.push(name); console.log("FAIL", name, "\n     ", e.message.split("\n")[0]); }
}
const NOW = Date.parse("2026-11-12T10:00:00Z");
const iso = (minAgo: number) => new Date(NOW - minAgo * 60000).toISOString();
const hb = (minAgo: number, fails = 0) => ({ last_tick_at: iso(minAgo), last_ok_at: iso(minAgo), current_activity: null, current_phase: "done", next_run_at: null, consecutive_failures: fails });
const run = (outcome: string, finished = true, blockers: any[] = []) => ({ started_at: iso(1), finished_at: finished ? iso(0) : null, outcome, blockers });

test("tanpa heartbeat = inactive", () => assert.equal(computeExpertStatus({ heartbeat: null, lastRun: null, intervalMin: 30, pendingApprovals: 0, now: NOW }).state, "inactive"));
test("heartbeat segar tanpa masalah = monitoring", () => assert.equal(computeExpertStatus({ heartbeat: hb(10), lastRun: run("ok"), intervalMin: 30, pendingApprovals: 0, now: NOW }).state, "monitoring"));
test("heartbeat basi = inactive walau run terakhir ok", () => assert.equal(computeExpertStatus({ heartbeat: hb(120), lastRun: run("ok"), intervalMin: 30, pendingApprovals: 0, now: NOW }).state, "inactive"));
test("run belum selesai = working", () => assert.equal(computeExpertStatus({ heartbeat: hb(1), lastRun: run("running", false), intervalMin: 30, pendingApprovals: 0, now: NOW }).state, "working"));
test("kegagalan beruntun = blocked", () => assert.equal(computeExpertStatus({ heartbeat: hb(5, 2), lastRun: run("error"), intervalMin: 30, pendingApprovals: 0, now: NOW }).state, "blocked"));
test("blocker = blocked dengan pesan", () => {
  const s = computeExpertStatus({ heartbeat: hb(5), lastRun: run("blocked", true, [{ code: "X", message: "token mati", fix: "isi token" }]), intervalMin: 30, pendingApprovals: 0, now: NOW });
  assert.equal(s.state, "blocked"); assert.equal(s.detail, "token mati");
});
test("ada rencana pending = waiting_user", () => assert.equal(computeExpertStatus({ heartbeat: hb(5), lastRun: run("ok"), intervalMin: 30, pendingApprovals: 2, now: NOW }).state, "waiting_user"));
test("run macet >10 menit tidak dianggap working", () => {
  const stuck = { started_at: iso(30), finished_at: null, outcome: "running", blockers: [] };
  assert.notEqual(computeExpertStatus({ heartbeat: hb(30), lastRun: stuck, intervalMin: 30, pendingApprovals: 0, now: NOW }).state, "working");
});

test("default policy: pause & scale auto, offer approve", () => {
  assert.equal(DEFAULT_AUTONOMY_POLICY.pause_campaign, "auto");
  assert.equal(DEFAULT_AUTONOMY_POLICY.change_offer, "approve");
});
test("change_offer tidak pernah auto", () => assert.equal(resolvePolicy({ change_offer: "auto" }).change_offer, "approve"));
test("nilai tak valid diabaikan", () => assert.equal(resolvePolicy({ scale_budget: "ngawur" }).scale_budget, "auto"));
test("policyAllowsAuto menghormati pengaturan", () => {
  const p = resolvePolicy({ scale_budget: "approve" });
  assert.equal(policyAllowsAuto(p, "scale_campaign_budget"), false);
  assert.equal(policyAllowsAuto(p, "pause_bleeding_campaign"), true);
  assert.equal(policyAllowsAuto(p, "aksi_tak_dikenal"), false);
});

test("preflight: tanpa secret = fail", () => {
  const c = evaluatePreflight({ settings: { overrides: {}, metaTokenPresent: true, found: true }, env: {}, tablesOk: true, subscriptions: 0, pushReady: false });
  assert.equal(c.find((x) => x.id === "CRON_SECRET")!.status, "fail");
  assert.equal(c.find((x) => x.id === "BUDGET_UNIT")!.status, "warn");
});
test("preflight: semua siap", () => {
  const c = evaluatePreflight({ settings: { overrides: { budgetUnitVerified: true }, metaTokenPresent: true, found: true }, env: { ENGINE_CRON_SECRET: "x" }, tablesOk: true, subscriptions: 1, pushReady: true });
  assert.ok(c.every((x) => x.status === "pass"));
});

test("filterTracked: null atau kosong mempertahankan semua", () => {
  const items = [{ id: "c1" }, { id: "c2" }];
  assert.equal(filterTracked(items, null, (x) => x.id).kept.length, 2);
  assert.equal(filterTracked(items, [], (x) => x.id).kept.length, 2);
  assert.equal(filterTracked(items, undefined, (x) => x.id).dropped, 0);
});

test("filterTracked: menyaring kampanye yang tidak dicentang", () => {
  const items = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];
  const res = filterTracked(items, ["c1", "c3"], (x) => x.id);
  assert.equal(res.kept.length, 2);
  assert.equal(res.dropped, 1);
  assert.deepEqual(res.kept.map((x) => x.id), ["c1", "c3"]);
});

console.log(`\n${passed} lulus, ${failures.length} gagal`);
if (failures.length) process.exit(1);
