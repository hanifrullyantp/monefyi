import { describe, expect, it } from 'vitest';
import { formatEstimationClientLine, estimationPdfMetaLabel } from './estimatorClientLine';

describe('formatEstimationClientLine - client display - formats name and place', () => {
  it('returns null when empty', () => {
    expect(formatEstimationClientLine({
      customer_name: '',
      customer_address: '',
      customer_phone: '',
    })).toBeNull();
  });

  it('joins name and address', () => {
    expect(formatEstimationClientLine({
      customer_name: 'Budi',
      customer_address: 'Jakarta',
      customer_phone: '',
    })).toBe('Budi · Jakarta');
  });

  it('falls back to phone', () => {
    expect(formatEstimationClientLine({
      customer_name: 'Budi',
      customer_address: '',
      customer_phone: '08123456789',
    })).toBe('Budi · 08123456789');
  });
});

describe('estimationPdfMetaLabel - PDF meta - status aware', () => {
  it('returns PDF Sent when sent_at set', () => {
    expect(estimationPdfMetaLabel('wa', '2026-01-01T00:00:00Z')).toBe('PDF Sent');
  });

  it('returns Draft for early status', () => {
    expect(estimationPdfMetaLabel('wa', null)).toBe('Draft');
  });
});
