// =====================================================
// Planner mapper unit tests — qty vs amount regression
// Run: npx tsx src/lib/planner-mapper.test.ts
// =====================================================

import { mapPlannerProject } from "./planner-mapper";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const projectId = "test-project-id";
const rapId = "rap-holo-id";

const mapped = mapPlannerProject({
  project: {
    id: projectId,
    org_id: "org-1",
    name: "Kitchen Set Kota Baru",
    client_name: "Klien",
    planned_start: "2026-01-01",
    planned_end: "2026-06-01",
    status: "active",
    progress_pct: 10,
    total_budget: 29_691_500,
    total_spent: 810_000,
    total_received: 9_700_000,
    settings: { type: "Interior" },
  },
  rapItems: [
    {
      id: rapId,
      project_id: projectId,
      type: "material",
      name: "Holo galvanis 1530 0,8 Sinar Raya",
      unit: "btg",
      quantity: 15,
      unit_price: 54_000,
      supplier: "Sinar Raya",
    },
  ],
  costs: [
    {
      id: "cost-1",
      project_id: projectId,
      rap_item_id: rapId,
      date: "2026-03-01",
      description: "Realisasi: Holo galvanis",
      quantity: 15,
      unit_price: 54_000,
      total_amount: 810_000,
    },
  ],
  incomes: [],
  workItems: [],
});

const holo = mapped.rap.materials[0];

assert(holo.qtyActual === 15, `qtyActual should be 15, got ${holo.qtyActual}`);
assert(holo.total === 810_000, `total should be 810000, got ${holo.total}`);
assert(mapped.budget.bahan.actual === 810_000, `bahan actual should be 810000`);
assert(
  mapped.budget.bahan.plan - mapped.budget.bahan.actual === 0,
  `bahan sisa should be 0 for full realization`
);

// Regression: previously total_amount was used as qty → astronomical total
const bad = mapPlannerProject({
  project: {
    id: projectId,
    org_id: "org-1",
    name: "Bad Case",
    planned_start: "2026-01-01",
    planned_end: "2026-06-01",
    total_budget: 1_000_000,
    total_spent: 810_000,
    total_received: 0,
  },
  rapItems: [
    {
      id: rapId,
      project_id: projectId,
      type: "material",
      name: "Holo",
      unit: "btg",
      quantity: 15,
      unit_price: 54_000,
    },
  ],
  costs: [
    {
      id: "cost-1",
      project_id: projectId,
      rap_item_id: rapId,
      date: "2026-03-01",
      description: "Realisasi",
      quantity: null,
      unit_price: 54_000,
      total_amount: 810_000,
    },
  ],
  incomes: [],
  workItems: [],
});

assert(
  bad.rap.materials[0].qtyActual === 15,
  `inferred qty should be 15 when quantity null, got ${bad.rap.materials[0].qtyActual}`
);
assert(
  bad.rap.materials[0].total === 810_000,
  `total must not be amount*unitPrice`
);
assert(bad.rap.materials[0].total < 10_000_000, "total must stay in millions not trillions");

console.log("planner-mapper tests passed");
