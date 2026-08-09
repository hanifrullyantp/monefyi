/**
 * Growth phases smoke tests — MONEFYI_GROWTH_PHASES.md
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTransactionInputInsight,
  getDailyDashboardInsight,
  getCategoryDetailInsight,
} from '../app/js/services/contextual-micro-insights.js';
import {
  generatePredictiveAlerts,
  dismissPredictiveAlert,
} from '../app/js/services/predictive-alerts.js';
import {
  COACHING_PLANS,
  enrollCoachingPlan,
  getActivePlanWithProgress,
  recommendPlanId,
} from '../app/js/services/coaching-plans.js';
import {
  loadReferralProfile,
  matchBuddy,
  addReferralCredit,
} from '../app/js/services/referral-buddy.js';
import {
  createLifeEventPlan,
  summarizeLifeEventPlan,
  LIFE_EVENT_TEMPLATES,
} from '../app/js/services/life-event-planner.js';
import { parseVoiceCommand } from '../app/js/services/voice-assistant.js';
import {
  getRolloutBucket,
  isFeatureEnabled,
} from '../app/js/services/feature-flag-store.js';
import { auditLandingParity } from '../app/js/services/landing-parity.js';

describe('Growth Fase 1 — micro-insights & predictive alerts', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { transactions: [], budget: { rows: [] } } };
  });

  it('generates transaction input insight for repeated category', () => {
    window.STATE.transactions = [
      { type: 'expense', category: 'Hiburan', amount: 50000, date: new Date().toISOString().slice(0, 10) },
      { type: 'expense', category: 'Hiburan', amount: 75000, date: new Date().toISOString().slice(0, 10) },
    ];
    const insight = getTransactionInputInsight({ type: 'expense', category: 'Hiburan', amount: 75000 });
    assert.ok(insight?.body.includes('Hiburan'));
  });

  it('generates predictive cash flow alert when runway negative', () => {
    window.STATE = {
      transactions: Array.from({ length: 7 }, (_, i) => ({
        id: `tx_${i}`,
        type: 'expense',
        amount: 150000,
        date: new Date().toISOString().slice(0, 10),
        merchant: `Shop${i}`,
      })),
      _dailySituation: { safeToSpend: 500000, daysToPayday: 10 },
      budget: { rows: [] },
    };
    const alerts = generatePredictiveAlerts(window.STATE);
    assert.ok(alerts.some((a) => a.type === 'cash_flow'));
    dismissPredictiveAlert('cash-flow-warning');
  });

  it('category detail insight compares weeks', () => {
    const now = new Date();
    const thisWeek = now.toISOString().slice(0, 10);
    window.STATE.transactions = [
      { type: 'expense', category: 'Makan', amount: 100000, date: thisWeek },
    ];
    const insight = getCategoryDetailInsight('Makan', window.STATE);
    assert.ok(insight?.title.includes('Makan'));
  });
});

describe('Growth Fase 3 — coaching plans', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { db: { userPreferences: { debt_amount: 6000000, monthly_income: 8000000 } } } };
  });

  it('has 5 coaching plans', () => {
    assert.equal(COACHING_PLANS.length, 5);
  });

  it('enrolls and tracks progress', () => {
    enrollCoachingPlan('mindful_spending');
    const active = getActivePlanWithProgress();
    assert.ok(active);
    assert.equal(active.plan.id, 'mindful_spending');
    assert.ok(active.progress >= 0);
  });

  it('recommends debt recovery for high DTI', () => {
    assert.equal(recommendPlanId(window.STATE), 'debt_recovery');
  });
});

describe('Growth Fase 4 — referral & buddy', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { db: { user: { email: 'hanif@test.com' } } } };
  });

  it('creates referral profile with code', () => {
    const ref = loadReferralProfile();
    assert.ok(ref.code);
    assert.match(ref.link, /monefyi\.com\/r\//);
  });

  it('matches buddy and tracks credits', () => {
    const buddy = matchBuddy();
    assert.ok(buddy.id);
    const { credits } = addReferralCredit(20000);
    assert.equal(credits, 20000);
  });
});

describe('Growth Fase 5 — life events & voice', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { _dailySituation: { safeToSpend: 2500000 } } };
  });

  it('creates life event plan with monthly needed', () => {
    assert.ok(LIFE_EVENT_TEMPLATES.length >= 5);
    const plan = createLifeEventPlan('wedding', { target_cost: 100000000, saved: 10000000, months: 12 });
    const summary = summarizeLifeEventPlan(plan);
    assert.ok(summary.monthly_needed > 0);
    assert.equal(summary.progress, 10);
  });

  it('parses voice balance query', () => {
    const parsed = parseVoiceCommand('berapa saldo saya sekarang');
    assert.equal(parsed?.intent, 'balance');
    assert.ok(parsed?.reply.includes('Safe-to-spend'));
  });

  it('parses voice record command', () => {
    const parsed = parseVoiceCommand('catat kopi 30rb gopay');
    assert.equal(parsed?.intent, 'record_transaction');
    assert.equal(parsed?.params.amount, 30000);
  });
});

describe('Sprint 5/6 — feature flags & landing parity', () => {
  beforeEach(() => {
    globalThis.window = {
      STATE: {
        featureFlags: {},
        featureFlagOverrides: {},
        db: { user: { id: 'user-growth-1' } },
      },
    };
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('feature flag rollout is deterministic', () => {
    assert.equal(getRolloutBucket('u1', 'weekly_ai_digest'), getRolloutBucket('u1', 'weekly_ai_digest'));
  });

  it('landing parity ready when critical flags active', () => {
    const flags = {
      household_mode: { enabled: true, status: 'active', rollout_pct: 100 },
      weekly_ai_digest: { enabled: true, status: 'active', rollout_pct: 100 },
      multiple_goals: { enabled: true, status: 'active', rollout_pct: 100 },
      debt_payoff_planner: { enabled: true, status: 'active', rollout_pct: 100 },
      ai_coach_pro: { enabled: true, status: 'beta', rollout_pct: 100 },
    };
    const audit = auditLandingParity(flags);
    assert.equal(audit.criticalFails, 0);
    assert.equal(audit.ready, true);
  });

  it('isFeatureEnabled respects overrides', () => {
    window.STATE.featureFlags = { multiple_goals: { enabled: true, rollout_pct: 100, status: 'active' } };
    window.STATE.featureFlagOverrides = { 'user-x': { multiple_goals: false } };
    assert.equal(isFeatureEnabled('multiple_goals', 'user-x'), false);
  });
});
