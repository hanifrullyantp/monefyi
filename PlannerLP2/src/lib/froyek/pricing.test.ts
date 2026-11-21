import assert from "node:assert/strict";
import test from "node:test";
import { defaultFroyekContent } from "./defaultContent.ts";
import { froyekContentSchema, visibleQuotes } from "./schema.ts";
import { recommendPlan, resolveFroyekCharge } from "./pricing.ts";

const emptyAnswers = {
  role: "pemilik",
  team: "solo",
  projectType: "konstruksi",
  scale: "kecil",
  problem: "berantakan",
  features: ["proyek"],
};

test("default froyek content matches the schema", () => {
  const parsed = froyekContentSchema.parse(defaultFroyekContent);
  assert.equal(parsed.locale, "id");
  assert.equal(parsed.pricing.plans.find((plan) => plan.id === "pro")?.priceLabel, "Rp 199.000");
  assert.equal(visibleQuotes(parsed).length, 0);
});

test("quote-only answers recommend estimator standard", () => {
  const result = recommendPlan(
    { ...emptyAnswers, problem: "penawaran", features: ["penawaran"] },
    defaultFroyekContent.wizard.rules,
  );
  assert.equal(result.planId, "estimator_standard");
  assert.ok(result.reasons.length > 0);
});

test("finance need recommends pro", () => {
  const result = recommendPlan(
    { ...emptyAnswers, problem: "uang", features: ["keuangan"] },
    defaultFroyekContent.wizard.rules,
  );
  assert.equal(result.planId, "pro");
});

test("unknown promo is rejected and list price is kept", () => {
  const list = resolveFroyekCharge("pro", "", []);
  assert.equal(list.ok && !list.contact && list.amount, 199_000);
  const bad = resolveFroyekCharge("pro", "GRATIS", []);
  assert.equal(bad.ok, false);
});

test("promo cannot exceed list price", () => {
  const high = resolveFroyekCharge("estimator_standard", "NAIK", [
    { code: "NAIK", planId: "estimator_standard", amount: 150_000, note: "" },
  ]);
  assert.equal(high.ok, false);
  const ok = resolveFroyekCharge("estimator_standard", "turun", [
    { code: "TURUN", planId: "estimator_standard", amount: 90_000, note: "" },
  ]);
  assert.equal(ok.ok && !ok.contact && ok.amount, 90_000);
});

test("enterprise is contact, not a charge", () => {
  const result = resolveFroyekCharge("enterprise", "", []);
  assert.equal(result.ok && result.contact, true);
});
