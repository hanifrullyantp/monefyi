import assert from "node:assert/strict";
import test from "node:test";
import {
  ESTIMATOR_HOST,
  ESTIMATOR_ORIGIN,
  PLANNER_HOST,
  PLANNER_ORIGIN,
  isEstimatorHost,
  legacyHostRedirects,
} from "./publicHosts.ts";

test("canonical hosts are froyek", () => {
  assert.equal(PLANNER_HOST, "froyek.com");
  assert.equal(ESTIMATOR_HOST, "estimator.froyek.com");
  assert.equal(PLANNER_ORIGIN, "https://froyek.com");
  assert.equal(ESTIMATOR_ORIGIN, "https://estimator.froyek.com");
});

test("estimator host includes the new subdomain and the legacy host", () => {
  assert.equal(isEstimatorHost("estimator.froyek.com"), true);
  assert.equal(isEstimatorHost("estimator.monefyi.com"), true);
  assert.equal(isEstimatorHost("froyek.com"), false);
  assert.equal(isEstimatorHost("planner.monefyi.com"), false);
});

test("legacy hosts redirect to froyek and skip /api", () => {
  const rules = legacyHostRedirects();
  const planner = rules.filter((rule) => rule.host === "planner.monefyi.com");
  const estimator = rules.filter((rule) => rule.host === "estimator.monefyi.com");
  assert.equal(planner.length, 2);
  assert.equal(estimator.length, 2);
  assert.ok(planner.every((rule) => rule.destination.startsWith("https://froyek.com")));
  assert.ok(estimator.every((rule) => rule.destination.startsWith("https://estimator.froyek.com")));
  assert.ok(rules.every((rule) => rule.permanent));
  assert.ok(rules.some((rule) => rule.source.includes("(?!api/)")));
  assert.ok(rules.every((rule) => !rule.source.startsWith("/api")));
});
