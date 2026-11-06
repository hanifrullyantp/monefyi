import { describe, expect, it } from 'vitest';
import { getCustomerSupportReply } from './customerSupportService';

describe('getCustomerSupportReply', () => {
  it('menjawab pertanyaan ganti password dengan instruksi yang tepat dan tidak ngelantur', () => {
    const res = getCustomerSupportReply('saya mau ganti password');
    expect(res.text.toLowerCase()).toContain('password');
    expect(res.text.toLowerCase()).toContain('pengaturan');
    expect(res.text.toLowerCase()).not.toContain('fitur estimator');
  });

  it('menjawab pertanyaan lupa kata sandi', () => {
    const res = getCustomerSupportReply('lupa kata sandi');
    expect(res.text.toLowerCase()).toContain('reset');
  });

  it('fallback jika pertanyaan asing tidak mengulang promosi fitur secara kaku', () => {
    const res = getCustomerSupportReply('xyz123 random prompt');
    expect(res.text).toContain('belum begitu menangkap');
    expect(res.suggestedActions?.some(a => a.label.includes('Password'))).toBe(true);
  });
});

