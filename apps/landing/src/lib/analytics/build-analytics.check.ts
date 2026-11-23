import assert from "node:assert/strict";
import { buildAnalytics } from "./build-analytics";

const now = new Date("2026-11-13T06:00:00.000Z");

const snapshot = buildAnalytics(
  [
    {
      id: "won-pro",
      name: "Sari",
      phone: "628111",
      status: "won",
      planTier: "pro",
      bumpTaken: true,
      paymentMethod: "qris",
      amount: 199000,
      estimatedValue: 1,
      checkoutStep: 5,
      createdAt: "2026-11-02T06:00:00.000Z",
      verifiedViaMayar: true,
    },
    {
      id: "pending",
      name: "Budi",
      phone: "628222",
      status: "pending_payment",
      planTier: "standard",
      bumpTaken: false,
      paymentMethod: "va",
      amount: 93000,
      checkoutStep: 5,
      createdAt: "2026-11-03T06:00:00.000Z",
    },
    {
      id: "early",
      name: "Dina",
      status: "new",
      planTier: "free",
      checkoutStep: 1,
      amount: 0,
      createdAt: "2026-06-02T06:00:00.000Z",
    },
  ],
  now
);

assert.equal(snapshot.totalVisitors, 3);
assert.equal(snapshot.funnelSteps[0].label, "Kunjungan tersimpan");
assert.equal(snapshot.funnelSteps[0].count, 3);
assert.equal(snapshot.funnelSteps.find((step) => step.id === "step5_payment")?.count, 2);
assert.equal(snapshot.funnelSteps.find((step) => step.id === "completed")?.count, 1);
assert.equal(snapshot.metrics.overallConversionRate, "33.3%");
assert.equal(snapshot.overview.revenue, 199000);
assert.equal(snapshot.overview.wonCount, 1);
assert.equal(snapshot.overview.closingRate, "33.3");
assert.equal(snapshot.plans.find((plan) => plan.id === "standard")?.name, "Paket Standard (Rp93.000)");
assert.equal(snapshot.plans.find((plan) => plan.id === "pro")?.name, "Paket PRO (Rp199.000)");
assert.equal(snapshot.plans.find((plan) => plan.id === "pro")?.amount, 199000);
assert.equal(snapshot.overview.sourceData.find((row) => row.name === "Mayar")?.value, 1);
assert.equal(snapshot.overview.sourceData.find((row) => row.name === "Checkout")?.value, 2);
assert.equal(snapshot.overview.monthly.find((row) => row.month === "Nov")?.revenue, 199000);
assert.equal(snapshot.recentOrders[0].name, "Budi");

const empty = buildAnalytics([], now);
assert.equal(empty.totalVisitors, 0);
assert.equal(empty.metrics.highestDropOffStep, "-");
assert.equal(empty.overview.revenue, 0);

console.log("build-analytics ok");
