import { describe, it, expect } from 'vitest';
import { assertBalanced, buildPaymentJournal, buildSplitPaymentJournal } from './journalService';
import type { ChartOfAccount } from '../../types/pos';

const mockAccounts: ChartOfAccount[] = [
  { id: 'a1', tenantId: 't1', code: '1100', name: 'Kas Tunai', accountType: 'asset', isSystem: true, isActive: true },
  { id: 'a2', tenantId: 't1', code: '1200', name: 'Kas Bank', accountType: 'asset', isSystem: true, isActive: true },
  { id: 'a3', tenantId: 't1', code: '1300', name: 'Piutang Xendit', accountType: 'asset', isSystem: true, isActive: true },
  { id: 'a4', tenantId: 't1', code: '1310', name: 'Saldo Xendit', accountType: 'asset', isSystem: true, isActive: true },
  { id: 'a5', tenantId: 't1', code: '4100', name: 'Pendapatan Kamar', accountType: 'revenue', isSystem: true, isActive: true },
  { id: 'a6', tenantId: 't1', code: '5100', name: 'Biaya PG', accountType: 'expense', isSystem: true, isActive: true },
  { id: 'a7', tenantId: 't1', code: '5200', name: 'Beban Gaji', accountType: 'expense', isSystem: true, isActive: true },
  { id: 'a8', tenantId: 't1', code: '5300', name: 'Beban Ops', accountType: 'expense', isSystem: true, isActive: true },
  { id: 'a9', tenantId: 't1', code: '4200', name: 'Retur', accountType: 'revenue', isSystem: true, isActive: true },
  { id: 'a10', tenantId: 't1', code: '2300', name: 'Uang Muka', accountType: 'liability', isSystem: true, isActive: true },
  { id: 'a11', tenantId: 't1', code: '1320', name: 'Piutang Transfer', accountType: 'asset', isSystem: true, isActive: true },
  { id: 'a12', tenantId: 't1', code: '1400', name: 'Piutang Karyawan', accountType: 'asset', isSystem: true, isActive: true },
];

describe('journalService - assertBalanced', () => {
  it('passes when debit equals credit', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a1', debit: 500000, credit: 0 },
        { accountId: 'a5', debit: 0, credit: 500000 },
      ])
    ).not.toThrow();
  });

  it('throws when unbalanced', () => {
    expect(() =>
      assertBalanced([
        { accountId: 'a1', debit: 500000, credit: 0 },
        { accountId: 'a5', debit: 0, credit: 400000 },
      ])
    ).toThrow('tidak seimbang');
  });
});

describe('journalService - buildPaymentJournal', () => {
  it('cash_sale - Debit Kas, Kredit Pendapatan', () => {
    const lines = buildPaymentJournal('cash_sale', 500000, mockAccounts);
    expect(lines).toHaveLength(2);
    expect(lines[0].debit).toBe(500000);
    expect(lines[1].credit).toBe(500000);
  });

  it('xendit_paid - includes fee', () => {
    const lines = buildPaymentJournal('xendit_paid', 500000, mockAccounts, { fee: 3500 });
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it('refund_cash - balanced', () => {
    const lines = buildPaymentJournal('refund_cash', 250000, mockAccounts);
    assertBalanced(lines);
  });

  it('payroll - balanced', () => {
    const lines = buildPaymentJournal('payroll', 5500000, mockAccounts);
    assertBalanced(lines);
  });
});

describe('journalService - split payment', () => {
  it('split payment journal balanced', () => {
    const lines = buildSplitPaymentJournal(
      [
        { code: '1100', amount: 300000 },
        { code: '1200', amount: 200000 },
      ],
      500000,
      mockAccounts
    );
    assertBalanced(lines);
  });
});
