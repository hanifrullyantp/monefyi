import { createServer } from 'vite';

// The same fixture and source modules are used for the before/after measurements.
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, logLevel: 'error' });
try {
  const { createBuildingModel, DEFAULT_SETTINGS } = await vite.ssrLoadModule('/src/data/config.ts');
  const { SEED_CATALOG } = await vite.ssrLoadModule('/src/data/catalog.ts');
  const { SPEC_GROUPS } = await vite.ssrLoadModule('/src/data/spec.ts');
  const { buildAutoRooms } = await vite.ssrLoadModule('/src/geometry/layout.ts');
  const { polygonArea } = await vite.ssrLoadModule('/src/geometry/polygon.ts');
  const { deriveGeometry } = await vite.ssrLoadModule('/src/geometry/derived.ts');
  const { computeRab } = await vite.ssrLoadModule('/src/engine/rab.ts');
  const spec = Object.fromEntries(SPEC_GROUPS.map(g => [g.key, 'menengah']));
  console.log('area_requested;floors;area_model;ground_rooms_m2;upper_rooms_m2;net_wall_m2;direct;rap;sale_ex_tax;vat;buyer_total;rp_per_m2;p10;p90');
  for (const area of [45, 70, 100, 120, 200]) {
    for (const floors of [1, 2]) {
      const model = createBuildingModel({ area, floors, location: 'Yogyakarta', finishing: 'menengah' });
      model.rooms = buildAutoRooms(model);
      const r = computeRab({ model, settings: DEFAULT_SETTINGS, catalog: SEED_CATALOG, spec,
        now: new Date('2026-01-01T00:00:00Z'), ppnEnabled: true });
      const roomArea = level => model.rooms.filter(x => x.level === level).reduce((s, x) => s + polygonArea(x.polygon), 0).toFixed(2);
      console.log([area, floors, model.area, roomArea(0), roomArea(1), deriveGeometry(model).netWallArea,
        r.rap.direct, r.rap.rap, r.rap.sellingPrice, r.ppn, r.total, r.perM2, r.p10, r.p90].join(';'));
    }
  }
} finally {
  await vite.close();
}