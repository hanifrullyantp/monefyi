export const JOURNAL_IMMUTABLE_TABLES = [
  'planner_journal_entries',
  'planner_journal_lines',
  'planner_journal_allocations',
] as const;

export type JournalImmutableTable = (typeof JOURNAL_IMMUTABLE_TABLES)[number];
export type JournalOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export const JOURNAL_MUTATION_ERROR_CODE = 'jurnal_tidak_boleh_diubah' as const;
export const JOURNAL_MUTATION_SQLSTATE = '55000' as const;

export class JournalImmutabilityError extends Error {
  readonly code = JOURNAL_MUTATION_ERROR_CODE;
  readonly sqlstate = JOURNAL_MUTATION_SQLSTATE;
  readonly operation: 'UPDATE' | 'DELETE';
  readonly table?: JournalImmutableTable;

  constructor(operation: 'UPDATE' | 'DELETE', table?: JournalImmutableTable) {
    super(JOURNAL_MUTATION_ERROR_CODE);
    this.name = 'JournalImmutabilityError';
    this.operation = operation;
    this.table = table;
  }
}

/**
 * Penjaga kontrak append-only pada level aplikasi:
 * hanya mengizinkan operasi SELECT dan INSERT pada tabel buku besar.
 * Operasi UPDATE dan DELETE selalu ditolak dengan error 'jurnal_tidak_boleh_diubah'.
 */
export function assertJournalOperationAllowed(
  operation: JournalOperation,
  table?: JournalImmutableTable,
): void {
  if (operation === 'UPDATE' || operation === 'DELETE') {
    throw new JournalImmutabilityError(operation, table);
  }
}
