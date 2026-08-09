/**
 * Roadmap Fase 7 smoke tests.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  findDuplicateTransaction,
  enrichImportPreview,
  SUPPORTED_IMPORT_SOURCES,
  EXTENDED_GMAIL_FILTER,
} from '../app/js/services/email-import-enhancer.js';
import {
  saveWalletConnection,
  loadWalletConnections,
  getIntegrationSummary,
  removeWalletConnection,
} from '../app/js/services/wallet-sync-registry.js';

describe('Fase 7.1 — email import enhancer', () => {
  it('lists extended supported sources', () => {
    assert.ok(SUPPORTED_IMPORT_SOURCES.length >= 12);
    assert.ok(SUPPORTED_IMPORT_SOURCES.some((s) => s.id === 'Kredivo'));
    assert.match(EXTENDED_GMAIL_FILTER, /kredivo/i);
  });

  it('detects duplicate transactions', () => {
    const dup = findDuplicateTransaction(
      { parsed_amount: 50000, parsed_date: '2026-08-09', parsed_type: 'expense', parsed_account: 'GoPay', parsed_merchant: 'Starbucks' },
      [{ id: 't1', amount: 50000, date: '2026-08-09', type: 'expense', account: 'GoPay', merchant: 'Starbucks Kemang' }],
    );
    assert.ok(dup);
    assert.equal(dup.id, 't1');
  });

  it('enriches import with category suggestion', async () => {
    globalThis.window = { STATE: { transactions: [] } };
    const enriched = await enrichImportPreview({
      parsed_amount: 45000,
      parsed_date: '2026-08-09',
      parsed_type: 'expense',
      parsed_merchant: 'Gojek ke kantor',
      parsed_category: 'Other',
      parse_confidence: 0.9,
    });
    assert.ok(enriched._categorySuggestion?.category || enriched.parsed_category !== 'Other');
  });
});

describe('Fase 7.2 — wallet sync registry', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
  });

  it('tracks wallet connections', () => {
    saveWalletConnection('gopay', { method: 'email', account_label: 'GoPay Utama' });
    assert.ok(loadWalletConnections().gopay);
    const summary = getIntegrationSummary();
    assert.equal(summary.linked_count, 1);
    removeWalletConnection('gopay');
    assert.equal(getIntegrationSummary().linked_count, 0);
  });

  it('lists providers with api status', () => {
    const summary = getIntegrationSummary();
    assert.ok(summary.providers.some((p) => p.category === 'paylater'));
    assert.ok(summary.api_coming > 0);
  });
});
