import { describe, expect, it } from 'vitest';
import { isRabEnabled, isRabSuperAdmin } from './rab';

describe('lib/rab — fitur guard RAB', () => {
  it('isRabEnabled default OFF (produksi) saat tidak ada env', () => {
    expect(isRabEnabled()).toBe(false);
  });

  describe('isRabSuperAdmin (super admin hanya hanif.rullyant@gmail.com, terverifikasi)', () => {
    it('menerima hanif.rullyant@gmail.com yang terverifikasi', () => {
      expect(isRabSuperAdmin('hanif.rullyant@gmail.com', true)).toBe(true);
    });

    it('case-insensitive dan tolerate spasi', () => {
      expect(isRabSuperAdmin('  Hanif.Rullyant@Gmail.com ', true)).toBe(true);
    });

    it('tolak email bukan super admin meski terverifikasi', () => {
      expect(isRabSuperAdmin('pelanggan@froyek.com', true)).toBe(false);
    });

    it('tolak hanif jika email tidak terverifikasi', () => {
      expect(isRabSuperAdmin('hanif.rullyant@gmail.com', false)).toBe(false);
      expect(isRabSuperAdmin('hanif.rullyant@gmail.com', undefined)).toBe(false);
    });

    it('tolak email kosong', () => {
      expect(isRabSuperAdmin('', true)).toBe(false);
      expect(isRabSuperAdmin(null as unknown as string, true)).toBe(false);
      expect(isRabSuperAdmin(undefined, true)).toBe(false);
    });
  });
});
