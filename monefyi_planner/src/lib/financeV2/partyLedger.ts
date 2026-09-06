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
  notes: string | null;
};

export type PartyAccount = {
  partyKey: string;
  displayName: string;
  piutang: number;
  hutang: number;
  net: number;
  lines: PartyLedgerLine[];
};

export function normalizePartyKey(name: string): string {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildPartyAccounts(input: {
  receivables: Receivable[];
  payables: Payable[];
}): PartyAccount[] {
  const map = new Map<string, PartyAccount>();

  const ensure = (name: string): PartyAccount => {
    const displayName = name.trim() || 'Tanpa nama';
    const partyKey = normalizePartyKey(displayName);
    const existing = map.get(partyKey);
    if (existing) return existing;
    const created: PartyAccount = {
      partyKey,
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
    const acc = ensure(rec.debtor_name);
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
      notes: rec.notes,
    });
  }

  for (const pay of input.payables) {
    const outstanding = Math.max(0, pay.amount - pay.paid_amount);
    if (outstanding <= 0 && pay.status === 'paid') continue;
    const acc = ensure(pay.creditor_name);
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
      notes: pay.notes,
    });
  }

  return [...map.values()]
    .map(acc => ({ ...acc, net: acc.piutang - acc.hutang }))
    .sort((a, b) => (b.piutang + b.hutang) - (a.piutang + a.hutang));
}

export function findPartyAccount(accounts: PartyAccount[], name: string): PartyAccount | null {
  const key = normalizePartyKey(name);
  return accounts.find(a => a.partyKey === key) || null;
}
