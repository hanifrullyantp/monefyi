import { describe, it, expect } from 'vitest';
import { parseBankCsv, matchBankTransactions } from './bankCsvParser';

describe('parseBankCsv - Generic CSV - Parses debit and credit columns', () => {
  it('parses standard bank CSV', () => {
    const csv = `Tanggal,Keterangan,Debit,Kredit
01/08/2026,Transfer masuk,0,500000
02/08/2026,Bayar listrik,150000,0`;

    const result = parseBankCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].type).toBe('credit');
    expect(result.rows[0].amount).toBe(500000);
    expect(result.rows[1].type).toBe('debit');
  });
});

describe('matchBankTransactions - Amount and date match - Returns matched pairs', () => {
  it('matches by amount and date', () => {
    const csvRows = [{ date: '2026-08-01', description: 'Test', amount: 100000, type: 'credit' as const }];
    const journals = [{ id: 'j1', date: '2026-08-01', description: 'Payment', amount: 100000 }];
    const { matched, unmatched } = matchBankTransactions(csvRows, journals);
    expect(matched).toHaveLength(1);
    expect(unmatched).toHaveLength(0);
  });
});
