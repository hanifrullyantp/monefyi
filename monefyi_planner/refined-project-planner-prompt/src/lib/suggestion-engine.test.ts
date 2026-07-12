// Run: npx tsx src/lib/suggestion-engine.test.ts
import { generateRapDraft, draftToCreatePayload } from "./suggestion-engine";
import { APP_DATA } from "./mock-data";

const draft = generateRapDraft({
  selections: [{ templateId: 1, volume: 3 }],
  templates: APP_DATA.database.templates,
  materials: APP_DATA.database.materials,
  projects: [],
});

if (draft.materials.length < 5) throw new Error("expected materials from Kitchen Set");
if (draft.materials[0].qtyPlan <= 0) throw new Error("qtyPlan must be positive");

const hpl = draft.materials.find((m) => m.name.includes("HPL"));
if (!hpl || hpl.qtyPlan !== 15) {
  throw new Error(`HPL qty should be 15 for 3m, got ${hpl?.qtyPlan}`);
}

const payload = draftToCreatePayload(draft, {
  name: "Test Kitchen",
  client: "Bp Test",
  startDate: "2026-07-01",
  endDate: "2026-09-01",
  contractValue: 13500000,
});

if (payload.materials.length === 0) throw new Error("payload materials empty");
if (payload.timeline.length < 4) throw new Error("timeline steps missing");

console.log("suggestion-engine tests passed");
