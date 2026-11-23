import { describe, expect, it } from 'vitest';
import { CS_AGENT_PROFILE, getCustomerSupportReply } from './customerSupportService';

describe('getCustomerSupportReply', () => {
  it('memakai brand Froyek (bukan Monefyi) di profil CS dan balasan', () => {
    expect(CS_AGENT_PROFILE.title).toContain('Froyek');
    expect(CS_AGENT_PROFILE.greeting).toContain('Froyek');
    expect(CS_AGENT_PROFILE.greeting).not.toMatch(/monefyi/i);
  });

  it('menjawab pertanyaan ganti password dengan instruksi yang tepat dan tidak ngelantur', () => {
    const res = getCustomerSupportReply('saya mau ganti password');
    expect(res.text.toLowerCase()).toContain('password');
    expect(res.text.toLowerCase()).toContain('pengaturan');
    expect(res.text).toContain('froyek.com/login');
    expect(res.text.toLowerCase()).not.toContain('fitur estimator');
  });

  it('menjawab pertanyaan lupa kata sandi', () => {
    const res = getCustomerSupportReply('lupa kata sandi');
    expect(res.text.toLowerCase()).toContain('reset');
  });

  it('menyembunyikan link/info Estimator saat allowEstimatorInfo false dan menampilkannya saat true', () => {
    const restricted = getCustomerSupportReply('cara bikin pdf penawaran');
    expect(restricted.suggestedActions?.some(a => a.payload === '/app/estimator')).toBe(false);
    expect(restricted.text).not.toContain('Estimator');

    const licensed = getCustomerSupportReply('cara bikin pdf penawaran', { allowEstimatorInfo: true });
    expect(licensed.suggestedActions?.some(a => a.payload === '/app/estimator')).toBe(true);
    expect(licensed.text).toContain('Froyek Estimator');
  });

  it('fallback jika pertanyaan asing tidak mengulang promosi fitur secara kaku', () => {
    const res = getCustomerSupportReply('xyz123 random prompt');
    expect(res.text).toContain('belum begitu menangkap');
    expect(res.suggestedActions?.some(a => a.label.includes('Password'))).toBe(true);
  });
});

