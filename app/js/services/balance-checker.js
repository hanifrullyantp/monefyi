/**
 * Balance sheet assembly + suspense / imbalance detection.
 * @module services/balance-checker
 */

import { LABELS, t } from '../constants/language.js';

/** @typedef {{ key: string, label: string, amount: number, icon: string }} NeracaRow */

export const AKTIVA_ROWS = [
  { key: 'kas', label: 'Kas', icon: 'wallet' },
  { key: 'piutang', label: 'Piutang', icon: 'list' },
  { key: 'stok', label: 'Stok / Inventori', icon: 'shoppingBag' },
  { key: 'properti', label: 'Properti', icon: 'home' },
  { key: 'pra_bayar', label: 'Pra Bayar', icon: 'calendar' },
  { key: 'investasi', label: 'Investasi', icon: 'trendingUp' },
  { key: 'aset_lainnya', label: 'Aset Lainnya', icon: 'tag' },
];

export const PASIVA_ROWS = [
  { key: 'hutang_dagang', label: 'Hutang Dagang', icon: 'shoppingBag' },
  { key: 'hutang_pajak', label: 'Hutang Pajak', icon: 'bills' },
  { key: 'hutang_lainnya', label: 'Hutang Lainnya', icon: 'creditCard' },
  { key: 'modal', label: LABELS.NERACA.EQUITY, icon: 'bank' },
  { key: 'simpanan', label: 'Simpanan', icon: 'wallet' },
  { key: 'laba_ditahan', label: LABELS.NERACA.RETAINED_EARNINGS, icon: 'trendingUp' },
  { key: 'kewajiban_lainnya', label: 'Kewajiban Lainnya', icon: 'tag' },
];

/**
 * @param {object} amounts
 * @returns {object}
 */
export function buildBalanceSheet(amounts) {
  const aktiva = AKTIVA_ROWS.map((r) => ({
    ...r,
    amount: Number(amounts[r.key] || 0),
  }));
  const pasiva = PASIVA_ROWS.map((r) => ({
    ...r,
    amount: Number(amounts[r.key] || 0),
  }));

  const totalAktiva = aktiva.reduce((s, r) => s + r.amount, 0);
  const totalPasiva = pasiva.reduce((s, r) => s + r.amount, 0);
  const diff = totalAktiva - totalPasiva;

  return {
    aktiva,
    pasiva,
    totalAktiva,
    totalPasiva,
    diff,
    balanced: Math.abs(diff) < 1,
    cashAccounts: amounts.cashAccounts || [],
    entities: amounts.entities || {},
    endISO: amounts.endISO,
    pnl: amounts.pnl || { income: 0, expense: 0, net: 0 },
    suspense: null,
  };
}

/**
 * Add Suspense row on the lighter side so totals match; keep warning.
 * @param {object} sheet
 */
export function applySuspense(sheet) {
  const diff = Number(sheet.diff || 0);
  if (Math.abs(diff) < 1) {
    return { ...sheet, balanced: true, suspense: null };
  }

  const amount = Math.abs(diff);
  /** @type {'aktiva'|'pasiva'} */
  const side = diff > 0 ? 'pasiva' : 'aktiva';

  const suspenseRow = {
    key: 'suspense',
    label: 'Selisih / Suspense',
    icon: 'alertTriangle',
    amount,
    isSuspense: true,
  };

  const aktiva = [...sheet.aktiva];
  const pasiva = [...sheet.pasiva];

  if (side === 'pasiva') {
    pasiva.push(suspenseRow);
  } else {
    aktiva.push(suspenseRow);
  }

  const totalAktiva = aktiva.reduce((s, r) => s + r.amount, 0);
  const totalPasiva = pasiva.reduce((s, r) => s + r.amount, 0);

  return {
    ...sheet,
    aktiva,
    pasiva,
    totalAktiva,
    totalPasiva,
    diff,
    balanced: false,
    suspense: {
      side,
      amount,
      message: diff > 0
        ? t(LABELS.NERACA.OWNS_MORE, { amount: formatId(amount) })
        : t(LABELS.NERACA.OWES_MORE, { amount: formatId(amount) }),
    },
  };
}

/**
 * @param {number} n
 */
function formatId(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

/**
 * Build human-readable fix suggestions.
 * @param {object} sheet
 * @param {object[]} suspects
 */
export function buildFixSuggestions(sheet, suspects) {
  const tips = [];
  if (sheet.suspense?.side === 'pasiva') {
    tips.push(LABELS.NERACA.TIP_OWES_SIDE);
    tips.push('Tambahkan entri di sisi hutang & modal, atau periksa aset yang terhitung dobel.');
  } else if (sheet.suspense?.side === 'aktiva') {
    tips.push(LABELS.NERACA.TIP_OWNS_SIDE);
    tips.push('Atau hutang yang terlalu besar dibanding aset — periksa daftar hutang.');
  }

  for (const s of (suspects || []).slice(0, 5)) {
    tips.push(`${s.reason}${s.tx?.date ? ` (${s.tx.date})` : ''}`);
  }

  if (!tips.length) {
    tips.push('Tidak ada transaksi suspect. Periksa entri manual aset/hutang/modal.');
  }
  return tips;
}
