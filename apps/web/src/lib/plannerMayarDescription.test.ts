import { describe, expect, it } from 'vitest';
import {
  buildMonefyiCheckoutDescription,
  parseMonefyiCheckoutDescription,
} from '../../../../my-supabase-project/supabase/functions/_shared/plannerMayarPayment.ts';

describe('Mayar checkout description metadata', () => {
  it('round-trips org and product fields with new prefix froyek:', () => {
    const desc = buildMonefyiCheckoutDescription({
      org_id: 'org-1',
      user_id: 'user-1',
      product: 'estimator_standard',
    });
    expect(desc).toContain('froyek:');
    expect(parseMonefyiCheckoutDescription(desc)).toMatchObject({
      org_id: 'org-1',
      user_id: 'user-1',
      product: 'estimator_standard',
    });
  });

  it('accepts legacy monefyi: prefix from older transactions', () => {
    const legacyDesc = 'monefyi:{"org_id":"legacy-org","user_id":"legacy-user","product":"estimator_pro"}';
    expect(parseMonefyiCheckoutDescription(legacyDesc)).toMatchObject({
      org_id: 'legacy-org',
      user_id: 'legacy-user',
      product: 'estimator_pro',
    });
  });
});
