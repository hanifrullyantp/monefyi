/** Jalankan: npx tsx src/lib/engine/__tests__/supervisor.scenarios.ts */
import assert from "node:assert/strict";
import { evaluateSupervisor, type SupervisorAction } from "../supervisor";

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log("OK  ", name); } catch (e: any) { failures.push(name); console.log("FAIL", name, "\n     ", e.message.split("\n")[0]); }
}
const NOW = Date.parse("2026-11-12T10:00:00Z");
const iso = (minAgo: number) => new Date(NOW - minAgo * 60000).toISOString();
const hb = (minAgo: number, fails = 0) => ({ last_tick_at: iso(minAgo), last_ok_at: iso(minAgo), current_activity: null, current_phase: "done", next_run_at: null, consecutive_failures: fails });
const act = (o: Partial<SupervisorAction> = {}): SupervisorAction => ({ at: iso(60 * 30), actionType: "scale_campaign_budget", ok: true, liveExecuted: true, undone: false, review: null, rolledBack: false, ...o });
const base = { now: NOW, heartbeat: hb(5), intervalMin: 30, killSwitch: false, actions: [] as SupervisorAction[] };

test("sehat tanpa data = belum_cukup_data, tanpa kill switch", () => {
  const r = evaluateSupervisor(base);
  assert.equal(r.grade, "belum_cukup_data"); assert.equal(r.score, null); assert.equal(r.engageKillSwitch, false);
});
test("heartbeat basi = critical, skor tetap dihitung, bukan kill switch", () => {
  const r = evaluateSupervisor({ ...base, heartbeat: hb(300) });
  assert.ok(r.findings.some((f) => f.code === "STALE")); assert.equal(r.engageKillSwitch, false); assert.notEqual(r.score, null);
});
test("belum pernah jalan = critical", () => assert.ok(evaluateSupervisor({ ...base, heartbeat: null }).findings.some((f) => f.code === "NEVER_RAN")));
test("3 kegagalan beruntun = critical", () => assert.ok(evaluateSupervisor({ ...base, heartbeat: hb(5, 3) }).findings.some((f) => f.code === "REPEATED_FAILURES")));
test("11 aksi live dalam 24 jam = kill switch", () => {
  const actions = Array.from({ length: 11 }, (_, i) => act({ at: iso(i + 1) }));
  assert.equal(evaluateSupervisor({ ...base, actions }).engageKillSwitch, true);
});
test("2 rollback dalam 24 jam = kill switch", () => {
  const actions = [act({ at: iso(10), rolledBack: true, review: "memburuk" }), act({ at: iso(20), rolledBack: true, review: "memburuk" })];
  assert.equal(evaluateSupervisor({ ...base, actions }).engageKillSwitch, true);
});
test("kill switch sudah aktif = tidak diulang", () => {
  const actions = Array.from({ length: 11 }, (_, i) => act({ at: iso(i + 1) }));
  assert.equal(evaluateSupervisor({ ...base, killSwitch: true, actions }).engageKillSwitch, false);
});
test("3 aksi gagal 24 jam = kill switch", () => {
  const actions = [1, 2, 3].map((i) => act({ at: iso(i), ok: false, liveExecuted: false }));
  assert.equal(evaluateSupervisor({ ...base, actions }).engageKillSwitch, true);
});
test("hit rate tinggi = baik", () => {
  const actions = [1, 2, 3, 4].map((i) => act({ at: iso(60 * 24 * i), review: i === 4 ? "stabil" : "membaik" }));
  const r = evaluateSupervisor({ ...base, actions });
  assert.equal(r.grade, "baik"); assert.equal(r.metrics.hitRatePct, 100);
});
test("hit rate rendah = usulan penyetelan, bukan perubahan otomatis", () => {
  const actions = [2, 3, 4, 5].map((i) => act({ at: iso(60 * 24 * i), review: i === 5 ? "membaik" : "memburuk" }));
  const r = evaluateSupervisor({ ...base, actions });
  assert.ok(r.findings.some((f) => f.code === "LOW_HIT_RATE")); assert.ok(r.suggestions.length > 0); assert.notEqual(r.grade, "baik");
});
test("data_belum_cukup tidak dihitung sebagai evaluasi", () => {
  const actions = [2, 3, 4].map((i) => act({ at: iso(60 * 24 * i), review: "data_belum_cukup" }));
  assert.equal(evaluateSupervisor({ ...base, actions }).metrics.reviewed, 0);
});
test("undo manual tinggi = peringatan", () => {
  const actions = [2, 3, 4].map((i) => act({ at: iso(60 * 24 * i), undone: true }));
  assert.ok(evaluateSupervisor({ ...base, actions }).findings.some((f) => f.code === "HIGH_USER_UNDO"));
});

console.log(`\n${passed} lulus, ${failures.length} gagal`);
if (failures.length) process.exit(1);
