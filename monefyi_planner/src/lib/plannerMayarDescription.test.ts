import { describe, expect, it } from 'vitest';
import {
  buildMonefyiCheckoutDescription,
  parseMonefyiCheckoutDescription,
} from '../../../my-supabase-project/supabase/functions/_shared/plannerMayarPayment.ts';

describe('Mayar checkout description metadata', () => {
  it('round-trips org and product fields', () => {
    const desc = buildMonefyiCheckoutDescription({
      org_id: 'org-1',
      user_id: 'user-1',
      product: 'estimator_standard',
    });
    expect(parseMonefyiCheckoutDescription(desc)).toMatchObject({
      org_id: 'org-1',
      user_id: 'user-1',
      product: 'estimator_standard',
    });
  });
});
