import { describe, expect, it } from 'vitest';
import { buildPartyAccounts, normalizePartyKey } from './partyLedger';
import type { Payable, Receivable } from '../../types/financeV2';

function rec(name: string, amount: number, paid = 0): Receivable {
  return {
    id: `r-${name}-${amount}`,
    org_id: 'o',
    debtor_type: 'person',
    debtor_name: name,
    debtor_project_id: 'p1',
    amount,
    paid_amount: paid,
    due_date: null,
    status: paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'open',
    notes: null,
    created_at: '',
  };
}

function pay(name: string, amount: number, paid = 0): Payable {
  return {
    id: `h-${name}-${amount}`,
    org_id: 'o',
    creditor_type: 'vendor',
    creditor_name: name,
    creditor_project_id: 'p1',
    category: 'dagang',
    amount,
    paid_amount: paid,
    due_date: null,
    status: paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'open',
    notes: null,
    created_at: '',
  };
}

describe('buildPartyAccounts', () => {
  it('merges hutang and piutang of the same party into one account', () => {
    const accounts = buildPartyAccounts({
      receivables: [rec('Hanif', 1_787_000)],
      payables: [pay('hanif', 500_000)],
    });
    expect(accounts).toHaveLength(1);
    expect(accounts[0].partyKey).toBe(normalizePartyKey('Hanif'));
    expect(accounts[0].piutang).toBe(1_787_000);
    expect(accounts[0].hutang).toBe(500_000);
    expect(accounts[0].net).toBe(1_287_000);
    expect(accounts[0].lines).toHaveLength(2);
  });
});
