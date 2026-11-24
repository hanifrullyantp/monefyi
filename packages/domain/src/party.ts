/**
 * Helper domain murni untuk identitas pihak (klien/pemasok/pekerja) berbasis `party_id`.
 * Seluruh pencocokan dan agregasi saldo hutang/piutang wajib bertumpu pada `party_id`,
 * bukan pengelompokan teks nama bebas.
 */

import { signedPartyAmount, toRupiah } from './journal';

export type PartyKind = 'person' | 'company';

export interface PartyRecord {
  id: string;
  displayName: string;
  normalizedName?: string;
  kind?: PartyKind;
  aliases?: string[];
}

export type PartyResolutionResult =
  | {
      status: 'resolved';
      partyId: string;
      party: PartyRecord;
      matchedBy: 'party_id' | 'normalized_name' | 'alias';
    }
  | {
      status: 'ambiguous';
      candidates: PartyRecord[];
      reason: 'pihak_ambigu';
    }
  | {
      status: 'not_found';
      reason: 'party_id_tidak_ditemukan' | 'nama_kosong' | 'pihak_tidak_ditemukan';
    };

export interface PartyLedgerAllocationInput {
  partyId?: string | null;
  partyName?: string | null;
  kind: 'piutang' | 'hutang';
  amount: number;
  paidAmount?: number;
  projectId?: string | null;
}

export interface PartyProjectBalance {
  piutang: number;
  hutang: number;
  net: number;
}

export interface PartyBalanceById {
  partyId: string;
  displayName: string;
  piutang: number;
  hutang: number;
  net: number;
  byProject: Record<string, PartyProjectBalance>;
}

export interface PartyAggregationResult {
  items: PartyBalanceById[];
  unassigned: {
    piutang: number;
    hutang: number;
    count: number;
  };
}

/** Normalisasi deterministik untuk pencocokan nama/alias pihak (bukan pengganti `party_id`). */
export function normalizePartyName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Resolusi `party_id` deterministik:
 * 1. Cocokkan berdasarkan `partyId` terlebih dahulu jika diberikan (tanpa fallback diam-diam ke nama).
 * 2. Jika `partyId` tidak diberikan, cocokkan exact normalized `normalizedName` / `displayName`, lalu exact normalized `aliases`.
 * 3. Menolak jika terdapat >1 kandidat cocok (`ambiguous`).
 */
export function resolvePartyId(
  parties: PartyRecord[],
  query: { partyId?: string | null; name?: string | null },
): PartyResolutionResult {
  const explicitId = query.partyId ? String(query.partyId).trim() : '';
  if (explicitId) {
    const matched = parties.find((p) => p.id === explicitId);
    if (!matched) {
      return { status: 'not_found', reason: 'party_id_tidak_ditemukan' };
    }
    return {
      status: 'resolved',
      partyId: matched.id,
      party: matched,
      matchedBy: 'party_id',
    };
  }

  const normalizedQuery = normalizePartyName(query.name);
  if (!normalizedQuery) {
    return { status: 'not_found', reason: 'nama_kosong' };
  }

  const exactNameMatches = parties.filter((p) => {
    const norm = p.normalizedName ? normalizePartyName(p.normalizedName) : normalizePartyName(p.displayName);
    return norm === normalizedQuery;
  });

  if (exactNameMatches.length === 1) {
    return {
      status: 'resolved',
      partyId: exactNameMatches[0].id,
      party: exactNameMatches[0],
      matchedBy: 'normalized_name',
    };
  }
  if (exactNameMatches.length > 1) {
    return {
      status: 'ambiguous',
      candidates: exactNameMatches,
      reason: 'pihak_ambigu',
    };
  }

  const aliasMatches = parties.filter((p) =>
    (p.aliases || []).some((alias) => normalizePartyName(alias) === normalizedQuery),
  );

  if (aliasMatches.length === 1) {
    return {
      status: 'resolved',
      partyId: aliasMatches[0].id,
      party: aliasMatches[0],
      matchedBy: 'alias',
    };
  }
  if (aliasMatches.length > 1) {
    return {
      status: 'ambiguous',
      candidates: aliasMatches,
      reason: 'pihak_ambigu',
    };
  }

  return { status: 'not_found', reason: 'pihak_tidak_ditemukan' };
}

function createEmptyPartyBucket(partyId: string, displayName: string): PartyBalanceById {
  return {
    partyId,
    displayName,
    piutang: 0,
    hutang: 0,
    net: 0,
    byProject: {},
  };
}

function addProjectDelta(
  bucket: PartyBalanceById,
  projectId: string | null | undefined,
  piutangDelta: number,
  hutangDelta: number,
): void {
  if (!projectId) return;
  const proj = bucket.byProject[projectId] || { piutang: 0, hutang: 0, net: 0 };
  proj.piutang += piutangDelta;
  proj.hutang += hutangDelta;
  proj.net = proj.piutang - proj.hutang;
  bucket.byProject[projectId] = proj;
}

function finalizePartyBuckets(map: Map<string, PartyBalanceById>): PartyBalanceById[] {
  return [...map.values()]
    .map((item) => ({
      ...item,
      net: item.piutang - item.hutang,
    }))
    .sort((a, b) => (b.piutang + b.hutang) - (a.piutang + a.hutang));
}

/**
 * Agregasi saldo hutang/piutang berdasarkan `party_id` (bukan teks nama).
 * Dua pihak berbeda `party_id` tidak akan pernah tercampur meskipun namanya mirip atau hanya berbeda kapitalisasi.
 */
export function aggregatePartyBalancesById(
  rows: PartyLedgerAllocationInput[],
  parties: PartyRecord[] = [],
  opts?: { allowMissingPartyId?: boolean },
): PartyAggregationResult {
  const directory = new Map(parties.map((p) => [p.id, p]));
  const map = new Map<string, PartyBalanceById>();
  const unassigned = { piutang: 0, hutang: 0, count: 0 };

  for (const row of rows) {
    const partyId = row.partyId ? String(row.partyId).trim() : '';
    const outstanding = Math.max(0, toRupiah(row.amount) - toRupiah(row.paidAmount ?? 0));

    if (!partyId) {
      if (!opts?.allowMissingPartyId) {
        throw new Error('Baris hutang/piutang wajib memiliki party_id.');
      }
      if (row.kind === 'piutang') unassigned.piutang += outstanding;
      else unassigned.hutang += outstanding;
      unassigned.count += 1;
      continue;
    }

    const dirEntry = directory.get(partyId);
    const label = dirEntry?.displayName || row.partyName?.trim() || partyId;
    const bucket = map.get(partyId) || createEmptyPartyBucket(partyId, label);

    if (row.kind === 'piutang') {
      bucket.piutang += outstanding;
      addProjectDelta(bucket, row.projectId, outstanding, 0);
    } else {
      bucket.hutang += outstanding;
      addProjectDelta(bucket, row.projectId, 0, outstanding);
    }

    map.set(partyId, bucket);
  }

  return {
    items: finalizePartyBuckets(map),
    unassigned,
  };
}

/**
 * Agregasi saldo hutang/piutang langsung dari baris jurnal buku besar berdasarkan `party_id`.
 */
export function aggregatePartyBalancesFromJournalLines(
  lines: Array<{
    accountType: string;
    debit: number;
    credit: number;
    partyId?: string | null;
    projectId?: string | null;
  }>,
  parties: PartyRecord[] = [],
  opts?: { allowMissingPartyId?: boolean },
): PartyAggregationResult {
  const directory = new Map(parties.map((p) => [p.id, p]));
  const map = new Map<string, PartyBalanceById>();
  const unassigned = { piutang: 0, hutang: 0, count: 0 };

  for (const line of lines) {
    const signed = signedPartyAmount(line.accountType, line.debit, line.credit);
    if (signed === null || signed === 0) continue;

    const isHutang = line.accountType.startsWith('hutang');
    const partyId = line.partyId ? String(line.partyId).trim() : '';

    if (!partyId) {
      if (!opts?.allowMissingPartyId) {
        throw new Error(`Baris jurnal akun ${line.accountType} wajib memiliki party_id.`);
      }
      if (isHutang) unassigned.hutang += signed;
      else unassigned.piutang += signed;
      unassigned.count += 1;
      continue;
    }

    const dirEntry = directory.get(partyId);
    const label = dirEntry?.displayName || partyId;
    const bucket = map.get(partyId) || createEmptyPartyBucket(partyId, label);

    if (isHutang) {
      bucket.hutang += signed;
      addProjectDelta(bucket, line.projectId, 0, signed);
    } else {
      bucket.piutang += signed;
      addProjectDelta(bucket, line.projectId, signed, 0);
    }

    map.set(partyId, bucket);
  }

  return {
    items: finalizePartyBuckets(map),
    unassigned,
  };
}
