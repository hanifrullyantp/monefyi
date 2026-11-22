import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import { cnameTarget, isDefaultAppHost } from './customDomainService';

describe('customDomainService', () => {
  it('defaults cnameTarget to cname.froyek.com when env override is unset', () => {
    expect(cnameTarget()).toBe('cname.froyek.com');
  });

  it('treats localhost, froyek.vercel.app, and legacy monefyi.vercel.app as default app hosts', () => {
    expect(isDefaultAppHost('localhost')).toBe(true);
    expect(isDefaultAppHost('froyek.vercel.app')).toBe(true);
    expect(isDefaultAppHost('monefyi.vercel.app')).toBe(true);
    expect(isDefaultAppHost('app.kontraktor.co.id')).toBe(false);
  });
});
