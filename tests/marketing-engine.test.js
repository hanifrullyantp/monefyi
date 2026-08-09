import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  buildUserContext,
  DEFAULT_GLOBAL_RULES,
  recordOfferInteraction,
} from '../app/js/services/marketing-engine.js';

describe('marketing-engine', () => {
  /** @type {Record<string, string>} */
  let storage;

  beforeEach(() => {
    storage = {};
    const ls = {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    };
    globalThis.localStorage = ls;
    globalThis.window = {
      STATE: {
        db: {
          profile: { plan_type: 'trial', created_at: '2026-08-01T00:00:00Z' },
          user: { id: 'user-test-1' },
        },
        transactions: [{ date: '2026-08-06', type: 'expense', amount: 10000 }],
        financialCondition: { level: 'safe' },
      },
      localStorage: ls,
    };
    globalThis.sessionStorage = {
      getItem: () => null,
      setItem: () => {},
    };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  });

  it('buildUserContext - trial user with days since registration', () => {
    const ctx = buildUserContext(window.STATE);
    assert.equal(ctx.plan, 'trial');
    assert.ok(ctx.days_since_registration >= 0);
    assert.equal(ctx.household_status, 'solo');
    assert.equal(ctx.financial_status, 'safe');
  });

  it('buildUserContext - couple_inactive when invite code exists', () => {
    storage.monefyi_household = JSON.stringify({
      invite_code: 'ABC123',
      members: [{ role: 'owner' }],
    });
    const ctx = buildUserContext(window.STATE);
    assert.equal(ctx.household_status, 'couple_inactive');
  });

  it('DEFAULT_GLOBAL_RULES has startup delay', () => {
    assert.equal(DEFAULT_GLOBAL_RULES.startup_delay_seconds, 3);
    assert.equal(DEFAULT_GLOBAL_RULES.max_offers_per_day, 1);
  });

  it('recordOfferInteraction - stores locally when no supabase', async () => {
    await recordOfferInteraction('offer-1', 'viewed', { session_id: 's1' });
    const raw = storage.monefyi_marketing_interactions;
    assert.ok(raw);
    const list = JSON.parse(raw);
    assert.equal(list[0].offer_id, 'offer-1');
    assert.equal(list[0].action, 'viewed');
  });
});

describe('financial-goals gating', () => {
  it('canCreateAdditionalGoal - basic plan limited to 1', async () => {
    const { canCreateAdditionalGoal, getMaxGoalsForPlan } = await import('../app/js/services/financial-goals.js');
    globalThis.window = {
      STATE: {
        db: {
          profile: { plan_type: 'trial' },
          financialGoals: [{ id: '1', status: 'active' }],
        },
      },
    };
    assert.equal(getMaxGoalsForPlan('trial'), 1);
    assert.equal(canCreateAdditionalGoal(), false);
    delete globalThis.window;
  });

  it('canCreateAdditionalGoal - lifetime unlimited', async () => {
    const { canCreateAdditionalGoal, getMaxGoalsForPlan } = await import('../app/js/services/financial-goals.js');
    globalThis.window = {
      STATE: {
        db: {
          profile: { plan_type: 'lifetime' },
          financialGoals: [{ id: '1', status: 'active' }, { id: '2', status: 'active' }],
        },
      },
    };
    assert.equal(getMaxGoalsForPlan('lifetime'), -1);
    assert.equal(canCreateAdditionalGoal(), true);
    delete globalThis.window;
  });
});
