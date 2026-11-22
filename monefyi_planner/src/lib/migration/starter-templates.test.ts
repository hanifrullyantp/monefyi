import { describe, expect, it } from 'vitest';
import { draftToCreatePayload } from './suggestion-engine';
import {
  getStarterTemplateById,
  getStarterTemplatesForProjectType,
  isConstructionProjectType,
  NON_CONSTRUCTION_STARTER_TEMPLATES,
  recalculateDraftTotals,
  starterTemplateToProjectDraft,
  type NonConstructionCategory,
} from './starter-templates';

const CONSTRUCTION_JARGON_RE = /\b(tukang|semen|cor|bata|keramik|besi|pondasi|mandor|kuli|sloof)\b/i;

describe('starter-templates (non-construction templates)', () => {
  it('covers all 4 non-construction categories (IT / Software, Jasa / Agensi, Event, Umum)', () => {
    const categories = NON_CONSTRUCTION_STARTER_TEMPLATES.map(t => t.category);
    const expected: NonConstructionCategory[] = ['it', 'service', 'event', 'other'];
    for (const cat of expected) {
      expect(categories).toContain(cat);
      const matched = getStarterTemplatesForProjectType(cat);
      expect(matched.length).toBeGreaterThanOrEqual(1);
      expect(matched[0].category).toBe(cat);
    }
    expect(NON_CONSTRUCTION_STARTER_TEMPLATES).toHaveLength(4);
  });

  it('returns empty for construction and falls back cleanly for custom/manufacturing types', () => {
    expect(isConstructionProjectType('construction')).toBe(true);
    expect(getStarterTemplatesForProjectType('construction')).toEqual([]);

    expect(isConstructionProjectType('it')).toBe(false);
    const customFallback = getStarterTemplatesForProjectType('custom_konsultan');
    expect(customFallback.length).toBeGreaterThanOrEqual(1);
    expect(customFallback[0].category).toBe('other');
  });

  it('contains zero construction-only jargon across template names, work items, and budget lines', () => {
    for (const template of NON_CONSTRUCTION_STARTER_TEMPLATES) {
      expect(template.name).not.toMatch(CONSTRUCTION_JARGON_RE);
      expect(template.description).not.toMatch(CONSTRUCTION_JARGON_RE);
      for (const wi of template.workItems) {
        expect(wi.name).not.toMatch(CONSTRUCTION_JARGON_RE);
      }
      for (const item of template.budgetItems) {
        expect(item.name).not.toMatch(CONSTRUCTION_JARGON_RE);
      }
    }
  });

  it('produces valid ProjectDraft and createProjectWithRap payloads for every non-construction template', () => {
    for (const template of NON_CONSTRUCTION_STARTER_TEMPLATES) {
      const found = getStarterTemplateById(template.id);
      expect(found?.id).toBe(template.id);

      const weightSum = template.workItems.reduce((s, w) => s + w.weight, 0);
      expect(weightSum).toBe(100);

      const draft = starterTemplateToProjectDraft(template);
      expect(draft.materials.length).toBeGreaterThan(0);
      expect(draft.workers.length).toBeGreaterThan(0);
      expect(draft.timeline.length).toBe(template.workItems.length);
      expect(draft.totalCost).toBeGreaterThan(0);
      expect(draft.totalSell).toBeGreaterThan(draft.totalCost);

      const payload = draftToCreatePayload(draft, {
        name: `Proyek ${template.categoryLabel}`,
        client: 'PT Contoh',
        startDate: '2026-11-01',
        endDate: '2026-12-31',
        contractValue: 0,
        type: template.category,
      });
      expect(payload.totalBudget).toBe(draft.totalCost);
      expect(payload.contractValue).toBe(draft.totalSell);
      expect(payload.timeline.length).toBe(template.workItems.length);
    }
  });

  it('recalculates draft totals when budget items are toggled', () => {
    const itTemplate = NON_CONSTRUCTION_STARTER_TEMPLATES.find(t => t.category === 'it')!;
    const draft = starterTemplateToProjectDraft(itTemplate);
    const reduced = recalculateDraftTotals(
      {
        ...draft,
        materials: draft.materials.map((m, idx) => (idx === 0 ? { ...m, enabled: false } : m)),
      },
      itTemplate.defaultMarginPct,
    );
    expect(reduced.totalCost).toBeLessThan(draft.totalCost);
    expect(reduced.totalSell).toBeLessThan(draft.totalSell);
  });
});
