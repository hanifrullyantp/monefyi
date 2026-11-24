import { normalizePartyName } from '../../../../../packages/domain/src/party';
import type { Payable, Receivable } from '../../types/financeV2';

export type PartyLedgerLine = {
  id: string;
  kind: 'piutang' | 'hutang';
  amount: number;
  paid: number;
  outstanding: number;
  dueDate: string | null;
  status: string;
  projectId: string | null;
  partyId: string | null;
  notes: string | null;
};

export type PartyAccount = {
  partyKey: string;
  partyId: string | null;
  displayName: string;
  piutang: number;
  hutang: number;
  net: number;
  lines: PartyLedgerLine[];
};

export function normalizePartyKey(name: string): string {
  return normalizePartyName(name);
}

export function partyAccountKey(partyId: string | null | undefined, name: string): string {
  const cleanId = partyId ? String(partyId).trim() : '';
  if (cleanId) return `id:${cleanId}`;
  return normalizePartyKey(name);
}

export function buildPartyAccounts(input: {
  receivables: Receivable[];
  payables: Payable[];
}): PartyAccount[] {
  const map = new Map<string, PartyAccount>();

  const ensure = (partyId: string | null | undefined, name: string): PartyAccount => {
    const cleanId = partyId ? String(partyId).trim() : null;
    const displayName = name.trim() || cleanId || 'Tanpa nama';
    const partyKey = partyAccountKey(cleanId, displayName);
    const existing = map.get(partyKey);
    if (existing) return existing;
    const created: PartyAccount = {
      partyKey,
      partyId: cleanId,
      displayName,
      piutang: 0,
      hutang: 0,
      net: 0,
      lines: [],
    };
    map.set(partyKey, created);
    return created;
  };

  for (const rec of input.receivables) {
    const outstanding = Math.max(0, rec.amount - rec.paid_amount);
    if (outstanding <= 0 && rec.status === 'paid') continue;
    const acc = ensure(rec.party_id, rec.debtor_name);
    acc.piutang += outstanding;
    acc.lines.push({
      id: rec.id,
      kind: 'piutang',
      amount: rec.amount,
      paid: rec.paid_amount,
      outstanding,
      dueDate: rec.due_date,
      status: rec.status,
      projectId: rec.debtor_project_id,
      partyId: rec.party_id ?? null,
      notes: rec.notes,
    });
  }

  for (const pay of input.payables) {
    const outstanding = Math.max(0, pay.amount - pay.paid_amount);
    if (outstanding <= 0 && pay.status === 'paid') continue;
    const acc = ensure(pay.party_id, pay.creditor_name);
    acc.hutang += outstanding;
    acc.lines.push({
      id: pay.id,
      kind: 'hutang',
      amount: pay.amount,
      paid: pay.paid_amount,
      outstanding,
      dueDate: pay.due_date,
      status: pay.status,
      projectId: pay.creditor_project_id,
      partyId: pay.party_id ?? null,
      notes: pay.notes,
    });
  }

  return [...map.values()]
    .map(acc => ({ ...acc, net: acc.piutang - acc.hutang }))
    .sort((a, b) => (b.piutang + b.hutang) - (a.piutang + a.hutang));
}

export function findPartyAccount(
  accounts: PartyAccount[],
  nameOrQuery: string | { partyId?: string | null; name?: string | null },
): PartyAccount | null {
  if (typeof nameOrQuery === 'object' && nameOrQuery !== null) {
    const cleanId = nameOrQuery.partyId ? String(nameOrQuery.partyId).trim() : '';
    if (cleanId) {
      return accounts.find(a => a.partyId === cleanId || a.partyKey === `id:${cleanId}`) || null;
    }
    const key = normalizePartyKey(nameOrQuery.name || '');
    if (!key) return null;
    const matches = accounts.filter(a => normalizePartyKey(a.displayName) === key || a.partyKey === key);
    return matches.length === 1 ? matches[0] : null;
  }

  const key = normalizePartyKey(nameOrQuery);
  if (!key) return null;
  const byLegacyKey = accounts.find(a => a.partyKey === key);
  if (byLegacyKey) return byLegacyKey;
  const byDisplay = accounts.filter(a => normalizePartyKey(a.displayName) === key);
  return byDisplay.length === 1 ? byDisplay[0] : null;
}
