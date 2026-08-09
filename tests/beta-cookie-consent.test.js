/**
 * Beta onboarding + cookie consent tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isBetaTester, shouldShowBetaWelcome, markBetaWelcomeSeen } from '../app/js/services/beta-onboarding.js';
import {
  parseCookieConsent,
  serializeCookieConsent,
  shouldLoadAnalytics,
  readStoredConsent,
  writeStoredConsent,
} from '../shared/cookie-consent.js';

describe('beta-onboarding', () => {
  it('isBetaTester true for early_access profile', () => {
    assert.equal(isBetaTester({ early_access: true }, () => false), true);
  });

  it('isBetaTester uses beta_feedback flag', () => {
    assert.equal(isBetaTester({}, (k) => k === 'beta_feedback'), true);
    assert.equal(isBetaTester({}, () => false), false);
  });

  it('shouldShowBetaWelcome tracks local seen flag', () => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    assert.equal(shouldShowBetaWelcome({ early_access: true }), true);
    markBetaWelcomeSeen();
    assert.equal(shouldShowBetaWelcome({ early_access: true }), false);
    delete globalThis.localStorage;
  });
});

describe('cookie-consent', () => {
  it('parseCookieConsent handles versioned payload', () => {
    const raw = serializeCookieConsent('accepted');
    assert.equal(parseCookieConsent(raw), 'accepted');
    assert.equal(parseCookieConsent('rejected'), 'rejected');
    assert.equal(parseCookieConsent(null), null);
  });

  it('shouldLoadAnalytics only when accepted', () => {
    assert.equal(shouldLoadAnalytics('accepted'), true);
    assert.equal(shouldLoadAnalytics('rejected'), false);
    assert.equal(shouldLoadAnalytics(null), false);
  });

  it('read/write stored consent', () => {
    const store = { _data: {}, getItem(k) { return this._data[k] ?? null; }, setItem(k, v) { this._data[k] = v; } };
    assert.equal(readStoredConsent(store), null);
    writeStoredConsent(store, 'accepted');
    assert.equal(readStoredConsent(store), 'accepted');
  });
});
