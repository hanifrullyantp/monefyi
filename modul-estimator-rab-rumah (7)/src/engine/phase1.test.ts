import { describe, expect, it } from 'vitest';
import { createBuildingModel, DEFAULT_SETTINGS, rectFootprint } from '../data/config';
import { SEED_CATALOG } from '../data/catalog';
import { SPEC_GROUPS, SPEC_ORDER } from '../data/spec';
import type { SpecLevel, SpecState } from '../data/types';
import { buildAutoRooms, repairLegacyRoomCopies } from '../geometry/layout';
import { deriveGeometry, formulaVariables } from '../geometry/derived';
import { overlapAreaConcave, polygonArea } from '../geometry/polygon';
import { computeRab, type EngineInput } from './rab';
import * as pricing from './pricing';
import { projectJson, rabCsv, whatsappSummary } from '../integration/exporters';
import { SEED_PROJECTS } from '../data/seed';
import { rupiah } from './money';

const levels = (s: SpecLevel) => Object.fromEntries(SPEC_GROUPS.map(g => [g.key, s])) as SpecState;
const input = (area = 100, floors = 1): EngineInput => {
  const model = createBuildingModel({ area, floors, finishing: 'menengah', location: 'Yogyakarta' });
  model.rooms = buildAutoRooms(model);
  return { model, settings: DEFAULT_SETTINGS, catalog: SEED_CATALOG, spec: levels('menengah'), now: new Date('2026-01-01T00:00:00Z') };
};

describe('Fase 1 / regresi terukur', () => {
  it('B1 | migrasi hanya menghapus salinan generator yang terbukti identik', () => {
    const { model } = input(70, 2);
    const parent = model.rooms.find(r => r.level === 1 && r.fungsi === 'kamar_utama')!;
    const duplicate = { ...parent, id: parent.id + '-L1', name: parent.name + ' (atas)' };
    const custom = { ...parent, id: 'ruang-buatan-pengguna', name: 'Ruang kerja pilihan saya' };
    const repaired = repairLegacyRoomCopies({ ...model, rooms: [...model.rooms, duplicate, custom] });
    expect(repaired.rooms.map(r => r.id)).not.toContain(duplicate.id);
    expect(repaired.rooms).toContain(custom);
    expect(repairLegacyRoomCopies(repaired)).toBe(repaired);
  });

  it.each([45, 70, 100, 120, 200])('B1 | rumah %i m2: satu partisi per lantai, tanpa salinan', area => {
    const rates = [1, 2].map(floors => {
      const f = input(area, floors);
      for (const level of f.model.levels) {
        const rooms = f.model.rooms.filter(r => r.level === level.index);
        expect(Math.abs(rooms.reduce((s, r) => s + polygonArea(r.polygon), 0) - polygonArea(level.footprint.points))).toBeLessThanOrEqual(0.05);
        expect(new Set(rooms.map(r => r.name)).size).toBe(rooms.length);
        for (const [i, room] of rooms.entries()) {
          expect(room.name).not.toMatch(/\(atas\).*\(atas\)/);
          expect(polygonArea(room.polygon) - overlapAreaConcave(room.polygon, level.footprint.points)).toBeLessThan(0.001);
          for (const other of rooms.slice(i + 1)) expect(overlapAreaConcave(room.polygon, other.polygon)).toBeLessThan(0.00001);
        }
      }
      return computeRab(f).perM2;
    });
    expect(rates[1] / rates[0]).toBeLessThanOrEqual(1.3);
  });

  it.each(['rekap', 'dalam_harga'] as const)('B2 | identitas harga dan toggle PPN: %s', overheadMode => {
    const f = input();
    const run = (ppnEnabled: boolean) => computeRab({ ...f, ppnEnabled, settings: { ...f.settings, overheadMode } });
    const on = run(true), off = run(false);
    for (const r of [on, off]) {
      expect(r.total).toBe(r.rap.sellingPrice + r.ppn);
      expect(r.ppn).toBe(r.rap.ppn);
      expect(r.rap.margin).toBe(r.rap.sellingPrice - r.rap.rap);
      expect(r.rap.rap).toBe(r.rap.direct + r.rap.indirect + r.rap.contingency);
      expect(r.terms.reduce((s, x) => s + x.amount, 0)).toBe(r.total);
    }
    expect(on.total - off.total).toBe(on.ppn);
    expect(on.rap.sellingPrice).toBe(off.rap.sellingPrice);
    expect(on.rap.margin).toBe(off.rap.margin);
    expect(on.rap.rap).toBe(off.rap.rap);
  });

  it('B3 | kuantil mengikuti biaya masing-masing tingkat, bukan rentang lama yang dijepit', () => {
    const f = input();
    const rows = SPEC_ORDER.map(level => computeRab({ ...f, spec: levels(level) }));
    rows.forEach((r, i) => {
      expect(r.p10).toBeLessThan(r.total);
      expect(r.p90).toBeGreaterThan(r.total);
      if (i) {
        expect(r.p10).toBeGreaterThan(rows[i - 1].p10);
        expect(r.p90).toBeGreaterThan(rows[i - 1].p90);
      }
    });
    // The composition can change slightly, but the quantiles must track the new total.
    for (const q of ['p10', 'p90'] as const) {
      const growth = rows[3][q] / rows[0][q];
      expect(Math.abs(growth / (rows[3].total / rows[0].total) - 1)).toBeLessThan(0.05);
    }
  });

  it('B4 | inversi total pembeli mengikuti parameter proyek', () => {
    const directCost = 100_000_000;
    for (const overheadMode of ['rekap', 'dalam_harga'] as const) for (const ppnEnabled of [true, false]) {
      const settings = { ...DEFAULT_SETTINGS, overheadMode, overheadPercent: 12, profitPercent: 9, ppnPercent: 10 };
      const price = pricing.computePricing({ directCost, settings, ppnEnabled });
      const inverse = pricing.invertPricing(price.total, 'total', { settings, ppnEnabled });
      expect(inverse.rap).toBe(price.rap);
      expect(inverse.direct).toBe(directCost);
      expect(inverse.total).toBe(price.total);
    }
  });

  it('B5 | mutu bahan tidak mengalikan upah atau alat', () => {
    const f = input();
    const a = computeRab({ ...f, spec: levels('ekonomis') });
    const b = computeRab({ ...f, spec: levels('premium') });
    expect(b.labor).toEqual(a.labor);
    expect(b.equipment).toEqual(a.equipment);
    expect(b.materials.reduce((s, r) => s + r.cost, 0)).toBeGreaterThan(a.materials.reduce((s, r) => s + r.cost, 0));
  });

  it('B5 | faktor khusus lantai tidak bocor ke kelompok lain, rekap tepat ke rupiah', () => {
    const f = input();
    const base = computeRab(f);
    const changed = computeRab({ ...f, settings: { ...f.settings, materialFactors: { lantai: {
      factors: { ekonomis: 1, standar: 1, menengah: 2, premium: 2 }, source: 'Fixture pengujian', calibrated: true,
    } } } });
    expect(changed.labor).toEqual(base.labor);
    expect(changed.equipment).toEqual(base.equipment);
    expect(changed.packages.filter(p => p.key !== 'lantai').map(p => p.amount)).toEqual(base.packages.filter(p => p.key !== 'lantai').map(p => p.amount));
    expect(changed.rap.direct).toBe([...changed.materials, ...changed.labor, ...changed.equipment].reduce((s,r) => s + r.cost, 0));
    expect(changed.packages.find(p => p.key === 'lantai')!.amount).toBeGreaterThan(base.packages.find(p => p.key === 'lantai')!.amount);
  });

  it('B3 | hanya bahan: menggandakan biaya menggandakan kedua kuantil', () => {
    const f = input();
    const w = SEED_CATALOG.workItems.find(i => i.id === 'lantai.keramik')!;
    const analysis = SEED_CATALOG.analisis.find(a => a.id === 'A.LNT.KRM.menengah')!;
    const catalog = { ...SEED_CATALOG, workItems: [w], analisis: [{ ...analysis, komponen: [{ komponenId: 'B.KRM.menengah', koefisien: 1 }] }] };
    const run = (level: SpecLevel) => computeRab({ ...f, catalog, spec: levels(level), settings: { ...f.settings, materialFactors: { lantai: {
      factors: { ekonomis: 1, standar: 1, menengah: 1, premium: 2 }, source: 'Data uji bahan tunggal', calibrated: false,
    } } } });
    const a = run('standar'), b = run('premium');
    for (const key of ['p10', 'p90', 'total'] as const) expect(Math.abs(b[key] - 2 * a[key])).toBeLessThanOrEqual(5);
  });

  it('B5 | faktor per kelas diterapkan satu kali pada bahan, termasuk waste dan indeks', () => {
    const f = input();
    const r = computeRab(f);
    const row = r.items.find(i => i.workItemId === 'lantai.keramik')!;
    const expected = row.komponen.reduce((s, c) => s + c.harga * c.koefisien * (1 + c.waste) * c.indeks * (c.jenis === 'bahan' ? 1.22 : 1), 0);
    expect(row.directUnitPrice).toBe(Math.round(expected));
    expect(row.komponen.filter(c => c.jenis !== 'bahan').every(c => c.specFactor === 1)).toBe(true);
  });

  it('B2 | beda penyajian markup tidak mengubah satu rupiah dari modal atau total pembeli', () => {
    const f = input(120, 2);
    const a = computeRab(f), b = computeRab({ ...f, settings: { ...f.settings, overheadMode: 'dalam_harga' } });
    expect(a.rap).toEqual(b.rap);
    expect(a.p10).toBe(b.p10); expect(a.p90).toBe(b.p90);
    expect(b.rap.direct).toBe(b.items.reduce((s, r) => s + r.directAmount!, 0));
    expect(b.total).toBe(a.total);
  });

  it('B2 | JSON, CSV dan ringkasan WhatsApp mengambil angka dari ledger yang sama', () => {
    const project = SEED_PROJECTS[0], r = computeRab({ ...input(), model: project.model });
    expect(JSON.parse(projectJson(project, r)).hasilRab.pricing).toEqual(r.rap);
    expect(rabCsv(project, r)).toContain(`"Total dibayar pembeli";"${r.total}"`);
    expect(rabCsv(project, r)).toContain(`"RAP (modal)";"${r.rap.rap}"`);
    expect(whatsappSummary(project, r)).toContain(rupiah(r.rap.sellingPrice));
    expect(whatsappSummary(project, r)).toContain(rupiah(r.total));
  });

  it('B4 | plafon sembarang tidak terlampaui dan biaya langsung berikutnya melampauinya', () => {
    const policy = { settings: { ...DEFAULT_SETTINGS, overheadPercent: 4.3, profitPercent: 12.75, ppnPercent: 10.5 }, ppnEnabled: true,
      rap: { indirectPercent: 2.75, contingencyPercent: 3.5 } };
    for (const target of [0, 1, 9999, 407123457]) {
      const v = pricing.invertPricing(target, 'total', policy);
      expect(v.total).toBeLessThanOrEqual(target);
      expect(pricing.computePricing({ ...policy, directCost: v.direct + 1 }).total).toBeGreaterThan(target);
    }
    expect(() => pricing.invertPricing(-1, 'total', policy)).toThrow();
  });

  it('B6 | dasar 60 + atas 40: lantai 100, pelat 40, urugan hanya tapak 60', () => {
    const f = input(100, 2);
    f.model.levels = [rectFootprint(10, 6), rectFootprint(8, 5)].map((footprint, index) => ({ index, height: 3.2, footprint }));
    f.model.rooms = buildAutoRooms(f.model);
    const g = deriveGeometry(f.model), v = formulaVariables(f.model);
    expect(g.totalFloorArea).toBe(100);
    expect(g.floorAreas).toEqual([60, 40]);
    expect(g.footprintArea).toBe(60);
    expect(v.luas_dasar).toBe(60);
    expect(v.luas_lantai).toBe(100);
    const r = computeRab(f);
    expect(r.items.find(i => i.workItemId === 'struktur.plat')?.volume).toBe(40);
    expect(r.items.find(i => i.workItemId === 'tanah.urug')?.volume).toBe(9);
    expect(r.items.find(i => i.workItemId === 'lantai.keramik')?.volume).toBe(100);
  });
});