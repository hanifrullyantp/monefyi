import assert from "node:assert/strict";
import test from "node:test";
import {
  buildToastFeedFromOrders,
  formatToastCustomerName,
  formatToastRelativeTime,
  type RawCrmOrderRow,
} from "./toastFeedMapper.ts";

const NOW = new Date("2026-11-27T08:00:00.000Z");

test("formatToastCustomerName - menyingkat nama sambil mempertahankan nama panggilan", () => {
  assert.equal(formatToastCustomerName("M. Rudi Santoso", true), "M. Rudi S.");
  assert.equal(formatToastCustomerName("M. Rudi", true), "M. Rudi");
  assert.equal(formatToastCustomerName("M.Rudi", true), "M. Rudi");
  assert.equal(formatToastCustomerName("Muhammad Rudi", true), "M. Rudi");
  assert.equal(formatToastCustomerName("Budi Santoso", true), "Budi S.");
  assert.equal(formatToastCustomerName("Suryadi", true), "Suryadi");
  assert.equal(formatToastCustomerName("Budi Santoso", false), "Budi Santoso");
});

test("buildToastFeedFromOrders - mengklasifikasikan Standard, PRO, Beli 2 sekaligus, Upgrade, dan Free sesuai fakta", () => {
  const rows: RawCrmOrderRow[] = [
    {
      id: "ord_pro_2x",
      email: "rudi@kontraktor.id",
      full_name: "M. Rudi",
      phone: "628123456001",
      status: "paid",
      grand_total: 298000,
      product_title: "Froyek Estimator PRO",
      created_at: "2026-11-27T07:45:00.000Z",
      raw_payload: {
        planTier: "pro",
        bumpTaken: true,
        status: "won",
        paidAt: "2026-11-27T07:45:00.000Z",
      },
    },
    {
      id: "ord_std",
      email: "ahmad@interior.co.id",
      full_name: "Ahmad Fauzi",
      phone: "628123456002",
      status: "paid",
      grand_total: 93000,
      product_title: "Froyek Estimator Standard",
      created_at: "2026-11-27T06:00:00.000Z",
      raw_payload: {
        planTier: "standard",
        bumpTaken: false,
        city: "Surabaya",
        status: "won",
      },
    },
    {
      id: "ord_upg",
      email: "deni@arsitek.id",
      full_name: "Deni Kurniawan",
      phone: "628123456003",
      status: "paid",
      grand_total: 143000,
      product_title: "Froyek Estimator Standard",
      created_at: "2026-11-27T05:00:00.000Z",
      raw_payload: {
        planTier: "standard",
        bumpTaken: true,
        status: "won",
      },
    },
    {
      id: "ord_pro_1",
      email: "hendra@bangun.id",
      full_name: "Hendra Wijaya",
      phone: "628123456004",
      status: "paid",
      grand_total: 199000,
      product_title: "Froyek Estimator PRO",
      created_at: "2026-11-25T08:00:00.000Z",
      raw_payload: {
        planTier: "pro",
        bumpTaken: false,
        status: "won",
      },
    },
    {
      id: "ord_free",
      email: "siti@studio.id",
      full_name: "Siti Aminah",
      phone: "628123456005",
      status: "free_active",
      grand_total: 0,
      product_title: "Froyek Estimator Free",
      created_at: "2026-11-27T07:50:00.000Z",
      raw_payload: {
        planTier: "free",
        status: "free_active",
      },
    },
  ];

  const { items, summary } = buildToastFeedFromOrders(rows, { now: NOW });

  assert.equal(items.length, 5);
  assert.equal(summary.bundle, 1);
  assert.equal(summary.standard, 1);
  assert.equal(summary.upgrade, 1);
  assert.equal(summary.pro, 1);
  assert.equal(summary.free, 1);

  const bundleItem = items.find((i) => i.id === "ord_pro_2x");
  assert.equal(bundleItem?.name, "M. Rudi");
  assert.equal(bundleItem?.product, "2 Akun Estimator PRO");
  assert.equal(bundleItem?.action, "baru saja membeli");
  assert.equal(bundleItem?.location, "");

  const stdItem = items.find((i) => i.id === "ord_std");
  assert.equal(stdItem?.name, "Ahmad F.");
  assert.equal(stdItem?.product, "Estimator Standard");
  assert.equal(stdItem?.location, "Surabaya");

  const upgItem = items.find((i) => i.id === "ord_upg");
  assert.equal(upgItem?.category, "upgrade");
  assert.equal(upgItem?.product, "Estimator PRO");

  const oldProItem = items.find((i) => i.id === "ord_pro_1");
  assert.equal(oldProItem?.action, "telah membeli");
  assert.equal(oldProItem?.timeAgo, "2 hari lalu");

  // Pastikan tidak ada nominal Rp maupun PII yang bocor
  for (const item of items) {
    assert.equal("email" in item, false);
    assert.equal("phone" in item, false);
    assert.equal(item.product.includes("Rp"), false);
    assert.equal(item.action.includes("Rp"), false);
  }
});

test("buildToastFeedFromOrders - menggabungkan 2 order lunas oleh pelanggan sama dalam 24 jam", () => {
  const rows: RawCrmOrderRow[] = [
    {
      id: "ord_1",
      email: "eko@proyek.id",
      full_name: "Eko Prasetyo",
      phone: "628111222333",
      status: "paid",
      grand_total: 93000,
      created_at: "2026-11-27T07:10:00.000Z",
      raw_payload: { planTier: "standard", status: "won" },
    },
    {
      id: "ord_2",
      email: "eko@proyek.id",
      full_name: "Eko Prasetyo",
      phone: "628111222333",
      status: "paid",
      grand_total: 199000,
      created_at: "2026-11-27T07:30:00.000Z",
      raw_payload: { planTier: "pro", status: "won" },
    },
  ];

  const { items } = buildToastFeedFromOrders(rows, { now: NOW });
  assert.equal(items.length, 1);
  assert.equal(items[0].category, "bundle");
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].product, "Estimator Standard & PRO sekaligus");
});

test("buildToastFeedFromOrders - menolak admin/test, belum bayar, expired, draft, dan placeholder", () => {
  const rows: RawCrmOrderRow[] = [
    {
      id: "t1",
      email: "hanif.rullyant@gmail.com",
      full_name: "Hanif Rullyant",
      status: "paid",
      grand_total: 199000,
      raw_payload: { planTier: "pro", status: "won" },
    },
    {
      id: "t2",
      email: "user@test.com",
      full_name: "Test User",
      status: "paid",
      grand_total: 93000,
      raw_payload: { planTier: "standard", status: "won" },
    },
    {
      id: "t3",
      email: "pending@mail.com",
      full_name: "Agus Pending",
      status: "pending",
      grand_total: 93000,
      raw_payload: { planTier: "standard", status: "pending_payment" },
    },
    {
      id: "t4",
      email: "abandoned@mail.com",
      full_name: "Bambang Batal",
      status: "abandoned",
      grand_total: 199000,
      raw_payload: { planTier: "pro", status: "abandoned_checkout" },
    },
    {
      id: "t5",
      email: "draft@mail.com",
      full_name: "Lead Checkout (Draft)",
      status: "free_active",
      grand_total: 0,
      raw_payload: { planTier: "free", status: "free_draft" },
    },
  ];

  const { items } = buildToastFeedFromOrders(rows, { now: NOW });
  assert.equal(items.length, 0);
});

test("formatToastRelativeTime - memformat waktu relatif dengan tepat", () => {
  assert.equal(formatToastRelativeTime("2026-11-27T07:59:30.000Z", NOW), "Baru saja");
  assert.equal(formatToastRelativeTime("2026-11-27T07:40:00.000Z", NOW), "20 menit lalu");
  assert.equal(formatToastRelativeTime("2026-11-27T05:00:00.000Z", NOW), "3 jam lalu");
  assert.equal(formatToastRelativeTime("2026-11-24T08:00:00.000Z", NOW), "3 hari lalu");
});

