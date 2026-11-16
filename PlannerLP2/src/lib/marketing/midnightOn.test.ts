import assert from "node:assert/strict";
import test from "node:test";
import { nextMidnightWib, parseMidnightOn } from "./midnightOn";

test("jam 19:48 WIB dijadwalkan ke 00:00 malam itu", () => {
  const now = new Date("2026-11-16T12:48:00.000Z");
  assert.equal(nextMidnightWib(now).toISOString(), "2026-11-16T17:00:00.000Z");
});

test("lewat tengah malam, jadwal berikutnya adalah 00:00 hari selanjutnya", () => {
  const now = new Date("2026-11-16T17:30:00.000Z");
  assert.equal(nextMidnightWib(now).toISOString(), "2026-11-17T17:00:00.000Z");
});

test("jadwal kosong ditolak", () => {
  assert.equal(parseMidnightOn(null), null);
  assert.equal(parseMidnightOn({ runAt: "2026-11-16T17:00:00.000Z", campaignIds: [] }), null);
});
