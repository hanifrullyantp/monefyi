import { extraPiutangBeyondContract } from './cashIdentity';
import { normalizePartyKey } from '../financeV2/partyLedger';

export type DividendParty = {
  id: string;
  name: string;
  sharePct: number;
  isOwner: boolean;
};

export type DividendPayout = {
  id: string;
  partyId: string;
  partyName: string;
  shareAmount: number;
  offsetPiutang: number;
  cashPaid: number;
  date: string;
  note?: string;
};

export type DividendConfig = {
  parties: DividendParty[];
  payouts: DividendPayout[];
};

export type DividendPreviewLine = {
  party: DividendParty;
  shareAmount: number;
  ownerPiutang: number;
  offsetPiutang: number;
  cashDue: number;
  alreadyPaid: number;
  remainingCash: number;
};

export function emptyDividendConfig(): DividendConfig {
  return { parties: [], payouts: [] };
}

export function parseDividendConfig(raw: unknown): DividendConfig {
  if (!raw || typeof raw !== 'object') return emptyDividendConfig();
  const rec = raw as Record<string, unknown>;
  const parties = Array.isArray(rec.parties) ? rec.parties : [];
  const payouts = Array.isArray(rec.payouts) ? rec.payouts : [];
  return {
    parties: parties.map((p, i) => {
      const row = (p || {}) as Record<string, unknown>;
      return {
        id: String(row.id || `p-${i}`),
        name: String(row.name || '').trim(),
        sharePct: Number(row.sharePct) || 0,
        isOwner: Boolean(row.isOwner),
      };
    }).filter(p => p.name),
    payouts: payouts.map((p, i) => {
      const row = (p || {}) as Record<string, unknown>;
      return {
        id: String(row.id || `pay-${i}`),
        partyId: String(row.partyId || ''),
        partyName: String(row.partyName || ''),
        shareAmount: Number(row.shareAmount) || 0,
        offsetPiutang: Number(row.offsetPiutang) || 0,
        cashPaid: Number(row.cashPaid) || 0,
        date: String(row.date || ''),
        note: row.note ? String(row.note) : undefined,
      };
    }),
  };
}

/** Kas kotor − realisasi − piutang non-owner (piutang owner dipulihkan ke kolam). */
export function dividendPool(input: {
  received: number;
  spent: number;
  totalPiutang: number;
  ownerPiutang: number;
  contractValue: number;
  alreadyPaidCash?: number;
}): number {
  const extra = extraPiutangBeyondContract(input.totalPiutang, input.contractValue, input.received);
  const ownerExtra = Math.min(extra, Math.max(0, input.ownerPiutang));
  const cash = (input.received || 0) - (input.spent || 0) - extra + ownerExtra;
  return Math.max(0, cash - (input.alreadyPaidCash || 0));
}

export function previewDividend(input: {
  pool: number;
  parties: DividendParty[];
  ownerPiutangByParty: Record<string, number>;
  payouts: DividendPayout[];
}): { lines: DividendPreviewLine[]; pctTotal: number; cashOut: number } {
  const pctTotal = input.parties.reduce((s, p) => s + p.sharePct, 0);
  const paidCashByParty = new Map<string, number>();
  for (const pay of input.payouts) {
    const key = pay.partyId || normalizePartyKey(pay.partyName);
    paidCashByParty.set(key, (paidCashByParty.get(key) || 0) + pay.cashPaid);
  }

  const lines = input.parties.map(party => {
    const shareAmount = input.pool * (party.sharePct / 100);
    const ownerPiutang = party.isOwner
      ? (input.ownerPiutangByParty[normalizePartyKey(party.name)] || 0)
      : 0;
    const offsetPiutang = Math.min(ownerPiutang, Math.max(0, shareAmount));
    const cashDue = Math.max(0, shareAmount - offsetPiutang);
    const alreadyPaid = paidCashByParty.get(party.id)
      || paidCashByParty.get(normalizePartyKey(party.name))
      || 0;
    return {
      party,
      shareAmount,
      ownerPiutang,
      offsetPiutang,
      cashDue,
      alreadyPaid,
      remainingCash: Math.max(0, cashDue - alreadyPaid),
    };
  });

  return {
    lines,
    pctTotal,
    cashOut: lines.reduce((s, l) => s + l.remainingCash, 0),
  };
}
