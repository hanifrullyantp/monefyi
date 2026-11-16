import assert from "node:assert/strict";
import test from "node:test";
import { mapMayarTransactionStatus } from "./mayarTransactionStatus.ts";

test("mapMayarTransactionStatus - lunas - menjadi deal", () => {
  for (const status of ["paid", "settled", "success"]) {
    const mapped = mapMayarTransactionStatus(status);
    assert.equal(mapped.isPaid, true);
    assert.equal(mapped.leadStatus, "won");
    assert.equal(mapped.orderStatus, "paid");
  }
});

test("mapMayarTransactionStatus - belum bayar - tetap menunggu", () => {
  for (const status of ["unpaid", "pending", "created", ""]) {
    const mapped = mapMayarTransactionStatus(status);
    assert.equal(mapped.isPaid, false);
    assert.equal(mapped.leadStatus, "pending_payment");
  }
});

test("mapMayarTransactionStatus - kedaluwarsa - tetap tampil sebagai tertunda", () => {
  const mapped = mapMayarTransactionStatus("expired");
  assert.equal(mapped.isPaid, false);
  assert.equal(mapped.leadStatus, "abandoned_checkout");
  assert.equal(mapped.orderStatus, "expired");
});
