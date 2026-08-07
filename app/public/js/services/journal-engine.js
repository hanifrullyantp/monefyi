/**
 * Double-entry journal engine for Neraca.
 * Maps Monefyi transactions → journal lines; builds balance sheet aggregates.
 * @module services/journal-engine
 */

import {
  clearAutoJournals,
  deleteJournalForTransaction,
  getNeracaMeta,
  listJournalEntries,
  loadNeracaEntities,
  replaceJournalForTransaction,
  setNeracaMeta,
} from './neraca-store.js';
import { applySuspense, buildBalanceSheet } from './balance-checker.js';
import { dedupeTransactions } from '../utils/transaction-utils.js';

/**
 * @param {object} tx
 * @returns {object}
 */
function getTxMeta(tx) {
  return (tx?.meta && typeof tx.meta === 'object') ? tx.meta : {};
}

/**
 * @param {object} tx
 * @returns {boolean}
 */
export function isLoanPaymentTransaction(tx) {
  const meta = getTxMeta(tx);
  if (meta.expense_treatment === 'loan_payment') return true;
  if (meta.linked_debt_id) return true;
  const cat = String(tx.category || tx.merchant || '').toLowerCase();
  return /cicilan|utang|kredit|hp/i.test(cat) && String(tx.type || '').toLowerCase() === 'expense';
}

/**
 * @param {object} tx
 * @returns {boolean}
 */
export function isAssetPurchaseTransaction(tx) {
  const meta = getTxMeta(tx);
  if (meta.is_asset_purchase || meta.expense_treatment === 'asset') return true;
  return false;
}

/**
 * @param {object} tx
 * @returns {object[]}
 */
export function buildJournalLinesForTransaction(tx) {
  if (!tx?.id) return [];
  const date = String(tx.date || '').slice(0, 10);
  const amt = Math.abs(Number(tx.amount || 0));
  if (!date || !amt) return [];
  const account = tx.account || 'Cash';
  const type = String(tx.type || 'expense').toLowerCase();
  const memo = tx.merchant || tx.category || tx.notes || type;
  const meta = getTxMeta(tx);

  if (type === 'income') {
    return [
      { entry_date: date, account_code: 'kas', sub_account: account, debit: amt, credit: 0, memo, source: 'auto' },
      { entry_date: date, account_code: 'laba_ditahan', sub_account: '', debit: 0, credit: amt, memo, source: 'auto' },
    ];
  }
  if (type === 'expense') {
    if (isAssetPurchaseTransaction(tx)) {
      const assetCode = meta.asset_account_code || 'aset_lainnya';
      return [
        { entry_date: date, account_code: assetCode, sub_account: memo, debit: amt, credit: 0, memo, source: 'auto' },
        { entry_date: date, account_code: 'kas', sub_account: account, debit: 0, credit: amt, memo, source: 'auto' },
      ];
    }
    if (isLoanPaymentTransaction(tx)) {
      const debtLabel = meta.linked_debt_name || tx.category || 'Cicilan';
      return [
        { entry_date: date, account_code: 'hutang_lainnya', sub_account: debtLabel, debit: amt, credit: 0, memo, source: 'auto' },
        { entry_date: date, account_code: 'kas', sub_account: account, debit: 0, credit: amt, memo, source: 'auto' },
      ];
    }
    return [
      { entry_date: date, account_code: 'laba_ditahan', sub_account: '', debit: amt, credit: 0, memo, source: 'auto' },
      { entry_date: date, account_code: 'kas', sub_account: account, debit: 0, credit: amt, memo, source: 'auto' },
    ];
  }
  if (type === 'transfer') {
    const to = tx.meta?.transfer_to;
    if (!to) {
      return [
        { entry_date: date, account_code: 'kas', sub_account: account, debit: 0, credit: amt, memo: `Transfer out ${memo}`, source: 'auto' },
        { entry_date: date, account_code: 'suspense', sub_account: '', debit: amt, credit: 0, memo: 'Transfer tanpa tujuan', source: 'auto' },
      ];
    }
    return [
      { entry_date: date, account_code: 'kas', sub_account: to, debit: amt, credit: 0, memo, source: 'auto' },
      { entry_date: date, account_code: 'kas', sub_account: account, debit: 0, credit: amt, memo, source: 'auto' },
    ];
  }
  return [];
}

/**
 * Sync journal for one transaction (non-throwing for callers).
 * @param {object} tx
 */
export async function syncFromTransaction(tx) {
  try {
    if (!tx?.id) return { success: false, error: 'no id' };
    const lines = buildJournalLinesForTransaction(tx);
    if (!lines.length) {
      await deleteJournalForTransaction(tx.id);
      return { success: true, data: [] };
    }
    await replaceJournalForTransaction(tx.id, lines);
    return { success: true, data: lines };
  } catch (error) {
    console.error('[neraca] syncFromTransaction failed', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove journal lines when transaction deleted.
 * @param {string} transactionId
 */
export async function removeTransactionJournal(transactionId) {
  try {
    await deleteJournalForTransaction(transactionId);
    return { success: true };
  } catch (error) {
    console.error('[neraca] removeTransactionJournal failed', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rebuild all auto journals from STATE.transactions.
 * @param {object[]} [transactions]
 */
export async function rebuildJournalsFromTransactions(transactions) {
  const txs = Array.isArray(transactions) ? transactions : (window.STATE?.transactions || []);
  try {
    await clearAutoJournals();
    for (const tx of txs) {
      const lines = buildJournalLinesForTransaction(tx);
      if (lines.length) {
        await replaceJournalForTransaction(tx.id, lines.map((l) => ({ ...l, source: 'rebuild' })));
      }
    }
    await setNeracaMeta('neraca_initialized', true);
    await setNeracaMeta('neraca_rebuild_at', new Date().toISOString());
    return { success: true, data: { count: txs.length } };
  } catch (error) {
    console.error('[neraca] rebuild failed', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ensure journals exist (first open).
 * @param {object[]} [transactions]
 */
export async function ensureNeracaInitialized(transactions) {
  const ready = await getNeracaMeta('neraca_initialized');
  if (ready) return { success: true, data: { skipped: true } };
  return rebuildJournalsFromTransactions(transactions);
}

/**
 * @param {string} endISO YYYY-MM-DD
 * @param {object[]} transactions
 * @param {{ startISO?: string }} [opts]
 * @returns {{ income: number, expense: number, net: number }}
 */
export function computePnLUpto(endISO, transactions, opts = {}) {
  const end = new Date(endISO);
  end.setHours(23, 59, 59, 999);
  const start = opts.startISO ? new Date(opts.startISO) : null;
  if (start) start.setHours(0, 0, 0, 0);

  let income = 0;
  let expense = 0;
  for (const tx of dedupeTransactions(transactions)) {
    const d = new Date(tx.date);
    if (d > end) continue;
    if (start && d < start) continue;
    const amt = Math.abs(Number(tx.amount || 0));
    if (tx.type === 'income') income += amt;
    else if (tx.type === 'expense') expense += amt;
  }
  return { income, expense, net: income - expense };
}

/**
 * Account balances up to date with optional opening balances per account.
 * @param {string} endISO
 * @param {object[]} transactions
 * @param {string[]} accounts
 * @param {Map<string, number>|Record<string, number>} [openingMap]
 */
export function computeCashBalancesUpto(endISO, transactions, accounts, openingMap) {
  const end = new Date(endISO);
  end.setHours(23, 59, 59, 999);
  const balances = new Map();

  const seedOpening = (name) => {
    if (!openingMap) return 0;
    if (openingMap instanceof Map) return Number(openingMap.get(name) || 0);
    return Number(openingMap[name] || 0);
  };

  for (const a of accounts || []) balances.set(a, seedOpening(a));

  for (const tx of dedupeTransactions(transactions)) {
    const d = new Date(tx.date);
    if (d > end) continue;
    const amt = Math.abs(Number(tx.amount || 0));
    const fromAcc = tx.account || 'Cash';
    balances.set(fromAcc, balances.get(fromAcc) ?? seedOpening(fromAcc));

    if (tx.type === 'income') {
      balances.set(fromAcc, (balances.get(fromAcc) || 0) + amt);
    } else if (tx.type === 'expense') {
      balances.set(fromAcc, (balances.get(fromAcc) || 0) - amt);
    } else if (tx.type === 'transfer') {
      balances.set(fromAcc, (balances.get(fromAcc) || 0) - amt);
      const toAcc = tx.meta?.transfer_to;
      if (toAcc) {
        balances.set(toAcc, (balances.get(toAcc) ?? seedOpening(toAcc)) + amt);
      }
    }
  }

  return [...balances.entries()]
    .map(([account, balance]) => ({ account, balance: Number(balance || 0) }))
    .sort((a, b) => b.balance - a.balance);
}

/**
 * Compare kas from transactions vs journal-derived totals.
 * @param {object} opts
 * @returns {Promise<object>}
 */
export async function reconcileNeracaWithTransactions(opts = {}) {
  const endISO = opts.endISO || new Date().toISOString().slice(0, 10);
  const transactions = opts.transactions || window.STATE?.transactions || [];
  const accounts = opts.accounts || window.STATE?.settings?.accounts || [];
  let openingMap = opts.openingMap;
  if (!openingMap) {
    try {
      const { getOpeningBalanceMap } = await import('./account-opening-balance.js');
      openingMap = await getOpeningBalanceMap(window.STATE?.db?.user?.id);
    } catch {
      openingMap = new Map();
    }
  }

  const cashList = computeCashBalancesUpto(endISO, transactions, accounts, openingMap);
  const kasFromTx = cashList.reduce((s, r) => s + r.balance, 0);
  const legacyOpening = Number(await getNeracaMeta('opening_kas') || 0);
  const kasTotal = kasFromTx + (openingMap instanceof Map && openingMap.size ? 0 : legacyOpening);

  const journals = await listJournalEntries();
  let kasFromJournal = 0;
  for (const je of journals) {
    if (je.account_code !== 'kas') continue;
    const d = String(je.entry_date || '').slice(0, 10);
    if (d > endISO) continue;
    kasFromJournal += Number(je.debit || 0) - Number(je.credit || 0);
  }

  const diff = kasTotal - kasFromJournal;
  return {
    kasFromTx: kasTotal,
    kasFromJournal,
    diff,
    balanced: Math.abs(diff) < 1000,
    cashAccounts: cashList,
    suspects: findSuspectTransactions(transactions, journals),
  };
}

/**
 * Build full neraca report for LIVE or HISTORY cutoff.
 * @param {{ endISO: string, transactions?: object[], accounts?: string[], applySuspenseNet?: boolean }} opts
 */
export async function computeNeracaReport(opts = {}) {
  const endISO = opts.endISO || new Date().toISOString().slice(0, 10);
  const transactions = opts.transactions || window.STATE?.transactions || [];
  const accounts = opts.accounts || window.STATE?.settings?.accounts || [];
  const applySuspenseNet = opts.applySuspenseNet !== false;
  const periodStart = opts.periodStart || null;

  let openingMap = opts.openingMap;
  if (!openingMap) {
    try {
      const { getOpeningBalanceMap } = await import('./account-opening-balance.js');
      openingMap = await getOpeningBalanceMap(window.STATE?.db?.user?.id);
    } catch {
      openingMap = new Map();
    }
  }

  const entities = await loadNeracaEntities();
  const cashList = computeCashBalancesUpto(endISO, transactions, accounts, openingMap);
  const legacyOpening = Number(await getNeracaMeta('opening_kas') || 0) || 0;
  const usePerAccountOpening = openingMap instanceof Map ? openingMap.size > 0 : Object.keys(openingMap || {}).length > 0;
  const kasTotal = cashList.reduce((s, r) => s + r.balance, 0) + (usePerAccountOpening ? 0 : legacyOpening);
  const pnl = periodStart
    ? computePnLUpto(endISO, transactions, { startISO: periodStart })
    : computePnLUpto(endISO, transactions);

  const sumByCat = (list, catKey, cat) =>
    (list || [])
      .filter((x) => !cat || x[catKey] === cat)
      .filter((x) => {
        const d = x.acquired_at || x.event_date || x.created_at;
        if (!d) return true;
        return String(d).slice(0, 10) <= endISO;
      })
      .reduce((s, x) => s + Number(x.amount || 0), 0);

  const openReceivables = (entities.receivables || []).filter((r) => {
    if (r.status === 'paid') return false;
    const d = r.created_at || r.due_date;
    if (d && String(d).slice(0, 10) > endISO) return false;
    return true;
  });

  const sheet = buildBalanceSheet({
    kas: kasTotal,
    cashAccounts: cashList,
    piutang: openReceivables.reduce((s, r) => s + Number(r.amount || 0), 0),
    stok: sumByCat(entities.assets, 'category', 'stok'),
    properti: sumByCat(entities.assets, 'category', 'properti'),
    pra_bayar: sumByCat(entities.assets, 'category', 'pra_bayar'),
    investasi: sumByCat(entities.assets, 'category', 'investasi'),
    aset_lainnya: sumByCat(entities.assets, 'category', 'aset_lainnya'),
    hutang_dagang: sumByCat(entities.debts, 'category', 'hutang_dagang'),
    hutang_pajak: sumByCat(entities.debts, 'category', 'hutang_pajak'),
    hutang_lainnya: sumByCat(entities.debts, 'category', 'hutang_lainnya'),
    kewajiban_lainnya: sumByCat(entities.debts, 'category', 'kewajiban_lainnya'),
    modal: (entities.equity || [])
      .filter((e) => e.kind === 'modal' && String(e.event_date || '').slice(0, 10) <= endISO)
      .reduce((s, e) => s + Number(e.amount || 0), 0),
    simpanan: (entities.equity || [])
      .filter((e) => e.kind === 'simpanan' && String(e.event_date || '').slice(0, 10) <= endISO)
      .reduce((s, e) => s + Number(e.amount || 0), 0),
    laba_ditahan: pnl.net,
    entities,
    endISO,
    pnl,
  });

  if (applySuspenseNet) {
    return applySuspense(sheet);
  }
  return sheet;
}

/**
 * Suspect transactions for imbalance tracing.
 * @param {object[]} transactions
 * @param {object[]} journalEntries
 */
export function findSuspectTransactions(transactions, journalEntries) {
  const byTx = new Map();
  for (const je of journalEntries || []) {
    if (!je.transaction_id) continue;
    const arr = byTx.get(je.transaction_id) || [];
    arr.push(je);
    byTx.set(je.transaction_id, arr);
  }

  const suspects = [];
  for (const tx of transactions || []) {
    const lines = byTx.get(tx.id) || [];
    const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (!lines.length) {
      suspects.push({
        tx,
        reason: 'Tidak punya pasangan jurnal',
        severity: 'high',
      });
    } else if (Math.abs(debit - credit) > 0.5) {
      suspects.push({
        tx,
        reason: `Jurnal tidak balance (D ${debit} / C ${credit})`,
        severity: 'high',
      });
    } else if (tx.type === 'transfer' && !tx.meta?.transfer_to) {
      suspects.push({
        tx,
        reason: 'Transfer tanpa akun tujuan',
        severity: 'medium',
      });
    }
  }

  const orphanTxIds = new Set((transactions || []).map((t) => t.id));
  for (const [txId, lines] of byTx.entries()) {
    if (!orphanTxIds.has(txId)) {
      suspects.push({
        tx: { id: txId, date: lines[0]?.entry_date, amount: 0, merchant: 'Orphan jurnal' },
        reason: 'Jurnal tanpa transaksi induk',
        severity: 'medium',
      });
    }
  }

  return suspects;
}

/**
 * @returns {Promise<object[]>}
 */
export async function getAllJournals() {
  return listJournalEntries();
}
