import { structuredError, type StructuredError } from '../../packages/domain/src/errors.ts';
import { toRupiah } from '../../packages/domain/src/journal.ts';

const TEN_MINUTES_MS = 10 * 60 * 1000;
const LOCK = 'catat-biaya-v1';

export type LockedCost = {
  projectId: string;
  item: string;
  total: number;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  entryDate: string;
  expiresAt: number;
};

export type PrepareOk = { ok: true; token: string; expiresAt: number; impact: string; cost: LockedCost };
export type PrepareFail = { ok: false; error: StructuredError };

function checksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function encode(cost: LockedCost): string {
  const body = JSON.stringify(cost);
  return `${body}.${checksum(body + LOCK)}`;
}

function decode(token: string): LockedCost | null {
  const splitAt = token.lastIndexOf('.');
  if (splitAt <= 0) return null;
  const body = token.slice(0, splitAt);
  const sig = token.slice(splitAt + 1);
  if (checksum(body + LOCK) !== sig) return null;
  try {
    const cost = JSON.parse(body) as LockedCost;
    if (!cost || typeof cost.projectId !== 'string' || typeof cost.total !== 'number') return null;
    return cost;
  } catch {
    return null;
  }
}

export function prepareRecordCost(input: {
  projectId: string;
  item: string;
  total: number;
  qty?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  entryDate: string;
  now: number;
}): PrepareOk | PrepareFail {
  const total = toRupiah(input.total);
  const item = input.item.trim();
  if (!input.projectId) {
    return { ok: false, error: structuredError('proyek_wajib', 'Pilih proyek dari hasil find_project.') };
  }
  if (!item) {
    return { ok: false, error: structuredError('item_wajib', 'Isi nama barang atau pekerjaan.') };
  }
  if (!Number.isInteger(total) || total <= 0) {
    return { ok: false, error: structuredError('nominal_tidak_valid', 'Nominal harus rupiah bulat lebih dari nol.') };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) {
    return { ok: false, error: structuredError('tanggal_tidak_valid', 'Tanggal harus YYYY-MM-DD.') };
  }
  const cost: LockedCost = {
    projectId: input.projectId,
    item,
    total,
    qty: input.qty == null ? null : input.qty,
    unit: input.unit ?? null,
    unitPrice: input.unitPrice == null ? null : toRupiah(input.unitPrice),
    entryDate: input.entryDate,
    expiresAt: input.now + TEN_MINUTES_MS,
  };
  return {
    ok: true,
    token: encode(cost),
    expiresAt: cost.expiresAt,
    impact: `${item} ${total} pada ${input.entryDate}`,
    cost,
  };
}

/** Commit hanya menerima token dan kunci idempoten. Nominal tidak dikirim ulang. */
export function commitRecordCost(input: {
  prepareToken: string;
  idempotencyKey: string;
  now: number;
}): { ok: true; cost: LockedCost } | PrepareFail {
  const key = input.idempotencyKey.trim();
  if (!key || key.length > 80) {
    return { ok: false, error: structuredError('kunci_idempoten_wajib', 'Kirim idempotency_key yang sama saat mencoba ulang.') };
  }
  const cost = decode(input.prepareToken);
  if (!cost) {
    return { ok: false, error: structuredError('token_tidak_sah', 'Siapkan ulang perintah. Token rusak.') };
  }
  if (input.now > cost.expiresAt) {
    return { ok: false, error: structuredError('token_kedaluwarsa', 'Siapkan ulang. Token berlaku 10 menit.') };
  }
  return { ok: true, cost };
}
