/**
 * Product-Marketing compliance — account deletion, refund, couple banner fallback.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  DELETION_CONFIRM_PHRASE,
  RECOVERY_DAYS,
  computeHardDeleteAt,
  daysUntilHardDelete,
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionChecklist,
  getDeletionStatus,
} from '../app/js/services/account-deletion.js';
import {
  REFUND_WINDOW_DAYS,
  REFUND_AUTO_LYNK_ENABLED,
  getPurchaseInfo,
  submitRefundRequest,
  recordPurchaseLocally,
} from '../app/js/services/refund-request.js';
import { buildUserContext } from '../app/js/services/marketing-engine.js';
import { LANDING_PROMISES } from '../app/js/services/landing-parity.js';

describe('account-deletion', () => {
  /** @type {Record<string, string>} */
  let storage;

  beforeEach(() => {
    storage = {};
    globalThis.localStorage = {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    };
    globalThis.window = { STATE: {}, localStorage: globalThis.localStorage };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  it('requestAccountDeletion - wrong phrase rejected', async () => {
    const res = await requestAccountDeletion('salah');
    assert.equal(res.success, false);
    assert.match(res.error || '', /HAPUS AKUN SAYA/);
  });

  it('requestAccountDeletion - valid phrase stores pending locally', async () => {
    const res = await requestAccountDeletion(DELETION_CONFIRM_PHRASE, 'testing');
    assert.equal(res.success, true);
    assert.equal(res.data?.status, 'pending');
    const status = await getDeletionStatus();
    assert.equal(status?.status, 'pending');
  });

  it('cancelAccountDeletion clears pending request', async () => {
    await requestAccountDeletion(DELETION_CONFIRM_PHRASE);
    const cancel = await cancelAccountDeletion();
    assert.equal(cancel.success, true);
    assert.equal(await getDeletionStatus(), null);
  });

  it('computeHardDeleteAt schedules RECOVERY_DAYS ahead', () => {
    const at = computeHardDeleteAt();
    const days = daysUntilHardDelete(at);
    assert.ok(days >= RECOVERY_DAYS - 1 && days <= RECOVERY_DAYS);
  });

  it('getDeletionChecklist returns 4 items', () => {
    assert.equal(getDeletionChecklist().length, 4);
  });
});

describe('refund-request', () => {
  /** @type {Record<string, string>} */
  let storage;

  beforeEach(() => {
    storage = {};
    globalThis.localStorage = {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    };
    globalThis.window = {
      STATE: {
        db: {
          profile: {
            plan_type: 'lifetime',
            created_at: new Date().toISOString(),
          },
        },
        subscription: { planType: 'lifetime' },
      },
      localStorage: globalThis.localStorage,
    };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  it('getPurchaseInfo - trial not eligible', () => {
    window.STATE.db.profile.plan_type = 'trial';
    window.STATE.subscription = { planType: 'trial' };
    localStorage.removeItem('monefyi_purchase_record');
    const info = getPurchaseInfo(window.STATE);
    assert.equal(info.eligible, false);
  });

  it('getPurchaseInfo - recent purchase eligible but gated without admin grant', () => {
    recordPurchaseLocally({
      plan_type: 'lifetime',
      purchased_at: new Date().toISOString(),
      reference: 'ORD-123',
    });
    const info = getPurchaseInfo(window.STATE);
    assert.equal(info.eligible, true);
    assert.equal(info.requestEnabled, false);
    assert.equal(info.canSubmit, false);
    assert.equal(info.reference, 'ORD-123');
  });

  it('getPurchaseInfo - canSubmit when super admin enabled refund', () => {
    recordPurchaseLocally({ plan_type: 'lifetime', purchased_at: new Date().toISOString() });
    window.STATE.db.profile.refund_request_enabled = true;
    const info = getPurchaseInfo(window.STATE);
    assert.equal(info.canSubmit, true);
  });

  it('submitRefundRequest - blocked without admin grant', async () => {
    recordPurchaseLocally({ plan_type: 'lifetime', purchased_at: new Date().toISOString() });
    const res = await submitRefundRequest('Fitur tidak sesuai ekspektasi saya.');
    assert.equal(res.success, false);
    assert.match(res.error || '', /belum diaktifkan|support/i);
  });

  it('submitRefundRequest - valid reason stored locally when enabled', async () => {
    recordPurchaseLocally({ plan_type: 'lifetime', purchased_at: new Date().toISOString() });
    window.STATE.db.profile.refund_request_enabled = true;
    const res = await submitRefundRequest('Fitur tidak sesuai ekspektasi saya.');
    assert.equal(res.success, true);
    assert.equal(res.data?.status, 'pending');
  });

  it('REFUND_AUTO_LYNK_ENABLED is false', () => {
    assert.equal(REFUND_AUTO_LYNK_ENABLED, false);
  });

  it('REFUND_WINDOW_DAYS is 7', () => {
    assert.equal(REFUND_WINDOW_DAYS, 7);
  });
});

describe('marketing couple banner', () => {
  it('buildUserContext - couple_inactive when invite pending', () => {
    globalThis.localStorage = {
      getItem: (k) => (k === 'monefyi_household'
        ? JSON.stringify({ invite_code: 'XYZ', members: [{ role: 'owner' }] })
        : null),
      setItem: () => {},
      removeItem: () => {},
    };
    globalThis.window = {
      STATE: { db: { profile: { plan_type: 'monthly' } }, transactions: [] },
      localStorage: globalThis.localStorage,
    };
    const ctx = buildUserContext(window.STATE);
    assert.equal(ctx.household_status, 'couple_inactive');
    delete globalThis.window;
    delete globalThis.localStorage;
  });
});

describe('landing-parity growth promises', () => {
  it('includes growth phase entries', () => {
    const ids = LANDING_PROMISES.map((p) => p.id);
    assert.ok(ids.includes('what_if_simulator'));
    assert.ok(ids.includes('financial_health_score'));
    assert.ok(ids.includes('life_event_planner'));
    assert.ok(ids.includes('voice_assistant'));
  });
});
