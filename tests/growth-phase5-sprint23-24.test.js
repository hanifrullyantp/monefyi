/**
 * Growth Q4 Sprint 23-24 — life event planner + voice assistant.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  projectInflatedCost,
  projectEducationPlan,
  createLifeEventPlan,
  summarizeLifeEventPlan,
  toggleLifeEventChecklist,
  getPrimaryLifeEventPlan,
} from '../app/js/services/life-event-planner.js';
import {
  parseVoiceCommand,
  executeVoiceCommand,
} from '../app/js/services/voice-assistant.js';

describe('Sprint 23 — life event planner', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('projectInflatedCost applies compound inflation', () => {
    const projected = projectInflatedCost(200_000_000, 16, 0.06);
    assert.ok(projected > 200_000_000);
    assert.ok(projected < 600_000_000);
  });

  it('projectEducationPlan stores inflation meta', () => {
    const plan = projectEducationPlan({ child_age: 2, saved: 5_000_000, base_cost: 200_000_000 });
    assert.equal(plan.template_id, 'education');
    assert.ok(plan.meta.years_to_college >= 1);
    assert.ok(plan.monthly_needed > 0);
  });

  it('toggleLifeEventChecklist updates checklist', () => {
    const plan = createLifeEventPlan('baby', { target_cost: 30_000_000, saved: 0, months: 9 });
    const updated = toggleLifeEventChecklist(plan.id, 0);
    assert.equal(updated.checklist[0].done, true);
    const summary = summarizeLifeEventPlan(getPrimaryLifeEventPlan());
    assert.equal(summary.checklist_done, 1);
  });
});

describe('Sprint 24 — voice assistant', () => {
  beforeEach(() => {
    globalThis.window = {
      STATE: {
        _dailySituation: { safeToSpend: 1500000 },
        transactions: [
          { date: '2026-08-01', merchant: 'Indomaret', amount: 45000, type: 'expense' },
        ],
      },
    };
    globalThis.localStorage = {
      _data: {},
      getItem() { return null; },
      setItem() {},
    };
  });

  it('parseVoiceCommand handles life event and what-if', () => {
    assert.equal(parseVoiceCommand('buka rencana nikah')?.intent, 'life_event');
    assert.equal(parseVoiceCommand('simulasi beli hp')?.intent, 'what_if');
    assert.equal(parseVoiceCommand('buka wishlist')?.intent, 'wishlist');
  });

  it('parseVoiceCommand returns last transaction', () => {
    const parsed = parseVoiceCommand('cek transaksi terakhir');
    assert.equal(parsed?.intent, 'last_transaction');
    assert.match(parsed?.reply || '', /Indomaret/);
  });

  it('executeVoiceCommand dispatches quick_add event', async () => {
    let fired = false;
    globalThis.window.addEventListener = (_, handler) => {
      globalThis.__voiceHandler = handler;
    };
    globalThis.window.dispatchEvent = (ev) => {
      if (ev.type === 'monefyi:voice-quick-add') fired = true;
    };
    const parsed = parseVoiceCommand('catat kopi 30rb');
    await executeVoiceCommand(parsed);
    assert.equal(fired, true);
  });
});
